/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { SecurityRoleMapping, SecurityUser } from '@elastic/elasticsearch/lib/api/types';

import type { PackageInfo, RegisterDeprecationsConfig } from '@kbn/core/server';
import {
  deprecationsServiceMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { licenseMock } from '../../common/licensing/index.mock';
import { securityMock } from '../mocks';
import { registerKibanaUserRoleDeprecation } from './kibana_user_role';

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
    registerKibanaUserRoleDeprecation(mockDeps);

    expect(mockDeps.deprecationsService.registerDeprecations).toHaveBeenCalledTimes(1);
    deprecationHandler = mockDeps.deprecationsService.registerDeprecations.mock.calls[0][0];
  });

  it('does not return any deprecations if security is not enabled', async () => {
    mockDeps.license.isEnabled.mockReturnValue(false);

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toEqual([]);
    expect(mockContext.esClient.asCurrentUser.security.getUser).not.toHaveBeenCalled();
    expect(mockContext.esClient.asCurrentUser.security.getRoleMapping).not.toHaveBeenCalled();
  });

  it('does not return any deprecations if none of the users and role mappings has a kibana user role', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResponse({ userA: createMockUser() });

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResponse({
      mappingA: { enabled: true, roles: ['roleA'], rules: {}, metadata: {} },
    });

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toEqual([]);
  });

  it('returns deprecations even if cannot retrieve users due to permission error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockRejectedValue(
      new errors.ResponseError(securityMock.createApiResponse({ statusCode: 403, body: {} }))
    );
    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResponse({
      mappingA: createMockRoleMapping(),
    });

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
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve users due to unknown error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockRejectedValue(
      new errors.ResponseError(securityMock.createApiResponse({ statusCode: 500, body: {} }))
    );
    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResponse({
      mappingA: createMockRoleMapping(),
    });

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
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve role mappings due to permission error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResponse({ userA: createMockUser() });
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
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve role mappings due to unknown error', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResponse({ userA: createMockUser() });
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
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });

  it('returns only user-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResponse({
      userA: createMockUser({ username: 'userA', roles: ['roleA'] }),
      userB: createMockUser({ username: 'userB', roles: ['roleB', 'kibana_user'] }),
      userC: createMockUser({ username: 'userC', roles: ['roleC'] }),
      userD: createMockUser({ username: 'userD', roles: ['kibana_user'] }),
    });

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResponse({
      mappingA: createMockRoleMapping(),
    });

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "api": Object {
                    "method": "POST",
                    "path": "/internal/security/deprecations/kibana_user_role/_fix_users",
                  },
                  "manualSteps": Array [
                    "Remove the \\"kibana_user\\" role from all users and add the \\"kibana_admin\\" role. The affected users are: userB, userD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Use the \\"kibana_admin\\" role to grant access to all Kibana features in all spaces.",
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });

  it('returns only role-mapping-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResponse({ userA: createMockUser() });

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResponse({
      mappingA: createMockRoleMapping({ roles: ['roleA'] }),
      mappingB: createMockRoleMapping({ roles: ['roleB', 'kibana_user'] }),
      mappingC: createMockRoleMapping({ roles: ['roleC'] }),
      mappingD: createMockRoleMapping({ roles: ['kibana_user'] }),
    });

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "api": Object {
                    "method": "POST",
                    "path": "/internal/security/deprecations/kibana_user_role/_fix_role_mappings",
                  },
                  "manualSteps": Array [
                    "Remove the \\"kibana_user\\" role from all role mappings and add the \\"kibana_admin\\" role. The affected role mappings are: mappingB, mappingD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Use the \\"kibana_admin\\" role to grant access to all Kibana features in all spaces.",
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });

  it('returns both user-related and role-mapping-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getUser.mockResponse({
      userA: createMockUser({ username: 'userA', roles: ['roleA'] }),
      userB: createMockUser({ username: 'userB', roles: ['roleB', 'kibana_user'] }),
      userC: createMockUser({ username: 'userC', roles: ['roleC'] }),
      userD: createMockUser({ username: 'userD', roles: ['kibana_user'] }),
    });

    mockContext.esClient.asCurrentUser.security.getRoleMapping.mockResponse({
      mappingA: createMockRoleMapping({ roles: ['roleA'] }),
      mappingB: createMockRoleMapping({ roles: ['roleB', 'kibana_user'] }),
      mappingC: createMockRoleMapping({ roles: ['roleC'] }),
      mappingD: createMockRoleMapping({ roles: ['kibana_user'] }),
    });

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "api": Object {
                    "method": "POST",
                    "path": "/internal/security/deprecations/kibana_user_role/_fix_users",
                  },
                  "manualSteps": Array [
                    "Remove the \\"kibana_user\\" role from all users and add the \\"kibana_admin\\" role. The affected users are: userB, userD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Use the \\"kibana_admin\\" role to grant access to all Kibana features in all spaces.",
                "title": "The \\"kibana_user\\" role is deprecated",
              },
              Object {
                "correctiveActions": Object {
                  "api": Object {
                    "method": "POST",
                    "path": "/internal/security/deprecations/kibana_user_role/_fix_role_mappings",
                  },
                  "manualSteps": Array [
                    "Remove the \\"kibana_user\\" role from all role mappings and add the \\"kibana_admin\\" role. The affected role mappings are: mappingB, mappingD.",
                  ],
                },
                "deprecationType": "feature",
                "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/some-branch/built-in-roles.html",
                "level": "warning",
                "message": "Use the \\"kibana_admin\\" role to grant access to all Kibana features in all spaces.",
                "title": "The \\"kibana_user\\" role is deprecated",
              },
            ]
          `);
  });
});
