/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { SecurityRoleMapping, SecurityUser } from '@elastic/elasticsearch/api/types';

import type { PackageInfo, RegisterDeprecationsConfig } from 'src/core/server';
import {
  deprecationsServiceMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';

import { licenseMock } from '../../common/licensing/index.mock';
import { securityMock } from '../mocks';
import { registerKibanaDashboardOnlyRoleDeprecation } from './kibana_dashboard_only_role';

function getDepsMock() {
  return {
    logger: loggingSystemMock.createLogger(),
    deprecationsService: deprecationsServiceMock.createSetupContract(),
    license: licenseMock.create(),
    packageInfo: {
      branch: 'some-branch',
      buildSha: 'sha',
      dist: true,
      version: '8.0.0',
      buildNum: 1,
    } as PackageInfo,
  };
}

function getContextMock() {
  return {
    esClient: elasticsearchServiceMock.createScopedClusterClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
  };
}

function createMockUser(user: Partial<SecurityUser> = {}) {
  return { enabled: true, username: 'userA', roles: ['roleA'], metadata: {}, ...user };
}

function createMockRoleMapping(mapping: Partial<SecurityRoleMapping> = {}) {
  return { enabled: true, roles: ['roleA'], rules: {}, metadata: {}, ...mapping };
}

describe('Kibana Dashboard Only User role deprecations', () => {
  let mockDeps: ReturnType<typeof getDepsMock>;
  let mockContext: ReturnType<typeof getContextMock>;
  let deprecationHandler: RegisterDeprecationsConfig;
  beforeEach(() => {
    mockContext = getContextMock();
    mockDeps = getDepsMock();
    registerKibanaDashboardOnlyRoleDeprecation(mockDeps);

    expect(mockDeps.deprecationsService.registerDeprecations).toHaveBeenCalledTimes(1);
    deprecationHandler = mockDeps.deprecationsService.registerDeprecations.mock.calls[0][0];
  });

  it('does not return any deprecations if security is not enabled', async () => {
    mockDeps.license.isEnabled.mockReturnValue(false);

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toEqual([]);
    expect(mockContext.esClient.asCurrentUser.security.getUser).not.toHaveBeenCalled();
    expect(mockContext.esClient.asCurrentUser.security.getRoleMapping).not.toHaveBeenCalled();
  });

  it('does not return any deprecations if none of the users and role mappings has a dashboard only role', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResolvedValue(
      securityMock.createApiResponse({ body: { userA: createMockUser() } })
    );

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResolvedValue(
      securityMock.createApiResponse({
        body: {
          mappingA: { enabled: true, roles: ['roleA'], rules: {}, metadata: {} },
        },
      })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toEqual([]);
  });

  it('returns deprecations even if cannot retrieve users due to permission error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockRejectedValue(
      new errors.ResponseError(securityMock.createApiResponse({ statusCode: 403, body: {} }))
    );
    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResolvedValue(
      securityMock.createApiResponse({ body: { mappingA: createMockRoleMapping() } })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Make sure you have a \\"manage_security\\" cluster privilege assigned.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/kibana/some-branch/xpack-security.html#_required_permissions_7",
                "level": "fetch_error",
                "message": "You do not have enough permissions to fix this deprecation.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check user roles",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve users due to unknown error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockRejectedValue(
      new errors.ResponseError(securityMock.createApiResponse({ statusCode: 500, body: {} }))
    );
    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResolvedValue(
      securityMock.createApiResponse({ body: { mappingA: createMockRoleMapping() } })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Check Kibana logs for more details.",
                  ],
                },
                "deprecationType": "feature",
                "level": "fetch_error",
                "message": "Failed to perform deprecation check. Check Kibana logs for more details.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check user roles",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve role mappings due to permission error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResolvedValue(
      securityMock.createApiResponse({ body: { userA: createMockUser() } })
    );
    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockRejectedValue(
      new errors.ResponseError(securityMock.createApiResponse({ statusCode: 403, body: {} }))
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Make sure you have a \\"manage_security\\" cluster privilege assigned.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/kibana/some-branch/xpack-security.html#_required_permissions_7",
                "level": "fetch_error",
                "message": "You do not have enough permissions to fix this deprecation.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check role mappings",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve role mappings due to unknown error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResolvedValue(
      securityMock.createApiResponse({ body: { userA: createMockUser() } })
    );
    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockRejectedValue(
      new errors.ResponseError(securityMock.createApiResponse({ statusCode: 500, body: {} }))
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Check Kibana logs for more details.",
                  ],
                },
                "deprecationType": "feature",
                "level": "fetch_error",
                "message": "Failed to perform deprecation check. Check Kibana logs for more details.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check role mappings",
              },
            ]
          `);
  });

  it('returns only user-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResolvedValue(
      securityMock.createApiResponse({
        body: {
          userA: createMockUser({ username: 'userA', roles: ['roleA'] }),
          userB: createMockUser({
            username: 'userB',
            roles: ['roleB', 'kibana_dashboard_only_user'],
          }),
          userC: createMockUser({ username: 'userC', roles: ['roleC'] }),
          userD: createMockUser({ username: 'userD', roles: ['kibana_dashboard_only_user'] }),
        },
      })
    );

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResolvedValue(
      securityMock.createApiResponse({ body: { mappingA: createMockRoleMapping() } })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Create a custom role with Kibana privileges to grant access to Dashboard only.",
                    "Remove the \\"kibana_dashboard_only_user\\" role from all users and add the custom role. The affected users are: userB, userD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Users with the \\"kibana_dashboard_only_user\\" role will not be able to access the Dashboard app. Use Kibana privileges instead.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check user roles",
              },
            ]
          `);
  });

  it('returns only role-mapping-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResolvedValue(
      securityMock.createApiResponse({ body: { userA: createMockUser() } })
    );

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResolvedValue(
      securityMock.createApiResponse({
        body: {
          mappingA: createMockRoleMapping({ roles: ['roleA'] }),
          mappingB: createMockRoleMapping({ roles: ['roleB', 'kibana_dashboard_only_user'] }),
          mappingC: createMockRoleMapping({ roles: ['roleC'] }),
          mappingD: createMockRoleMapping({ roles: ['kibana_dashboard_only_user'] }),
        },
      })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Create a custom role with Kibana privileges to grant access to Dashboard only.",
                    "Remove the \\"kibana_dashboard_only_user\\" role from all role mappings and add the custom role. The affected role mappings are: mappingB, mappingD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Users with the \\"kibana_dashboard_only_user\\" role will not be able to access the Dashboard app. Use Kibana privileges instead.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check role mappings",
              },
            ]
          `);
  });

  it('returns both user-related and role-mapping-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResolvedValue(
      securityMock.createApiResponse({
        body: {
          userA: createMockUser({ username: 'userA', roles: ['roleA'] }),
          userB: createMockUser({
            username: 'userB',
            roles: ['roleB', 'kibana_dashboard_only_user'],
          }),
          userC: createMockUser({ username: 'userC', roles: ['roleC'] }),
          userD: createMockUser({ username: 'userD', roles: ['kibana_dashboard_only_user'] }),
        },
      })
    );

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResolvedValue(
      securityMock.createApiResponse({
        body: {
          mappingA: createMockRoleMapping({ roles: ['roleA'] }),
          mappingB: createMockRoleMapping({ roles: ['roleB', 'kibana_dashboard_only_user'] }),
          mappingC: createMockRoleMapping({ roles: ['roleC'] }),
          mappingD: createMockRoleMapping({ roles: ['kibana_dashboard_only_user'] }),
        },
      })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Create a custom role with Kibana privileges to grant access to Dashboard only.",
                    "Remove the \\"kibana_dashboard_only_user\\" role from all users and add the custom role. The affected users are: userB, userD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Users with the \\"kibana_dashboard_only_user\\" role will not be able to access the Dashboard app. Use Kibana privileges instead.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check user roles",
              },
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "Create a custom role with Kibana privileges to grant access to Dashboard only.",
                    "Remove the \\"kibana_dashboard_only_user\\" role from all role mappings and add the custom role. The affected role mappings are: mappingB, mappingD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Users with the \\"kibana_dashboard_only_user\\" role will not be able to access the Dashboard app. Use Kibana privileges instead.",
                "title": "The \\"kibana_dashboard_only_user\\" role is deprecated: check role mappings",
              },
            ]
          `);
  });
});
