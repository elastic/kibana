/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { SecurityGetRoleRole } from '@elastic/elasticsearch/api/types';

import type { PackageInfo, RegisterDeprecationsConfig } from 'src/core/server';
import {
  deprecationsServiceMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';

import { licenseMock } from '../../common/licensing/index.mock';
import { securityMock } from '../mocks';
import { registerMLPrivilegesDeprecation } from './ml_privileges';

function getDepsMock() {
  return {
    logger: loggingSystemMock.createLogger(),
    deprecationsService: deprecationsServiceMock.createSetupContract(),
    license: licenseMock.create({
      allowML: true,
    }),
    packageInfo: {
      branch: 'some-branch',
      buildSha: 'sha',
      dist: true,
      version: '8.0.0',
      buildNum: 1,
    } as PackageInfo,
    applicationName: 'kibana-.kibana',
  };
}

function getContextMock() {
  return {
    esClient: elasticsearchServiceMock.createScopedClusterClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
  };
}

function createMockRole(role: Partial<SecurityGetRoleRole> = {}) {
  return {
    name: 'role',
    cluster: [],
    indices: [],
    run_as: [],
    applications: [],
    metadata: {},
    transient_metadata: { enabled: true },
    ...role,
  };
}

describe('Machine Learning privileges deprecations', () => {
  let mockDeps: ReturnType<typeof getDepsMock>;
  let mockContext: ReturnType<typeof getContextMock>;
  let deprecationHandler: RegisterDeprecationsConfig;
  beforeEach(() => {
    mockContext = getContextMock();
    mockDeps = getDepsMock();
    registerMLPrivilegesDeprecation(mockDeps);

    expect(mockDeps.deprecationsService.registerDeprecations).toHaveBeenCalledTimes(1);
    deprecationHandler = mockDeps.deprecationsService.registerDeprecations.mock.calls[0][0];
  });

  it('does not return any deprecations if security is not enabled', async () => {
    mockDeps.license.isEnabled.mockReturnValue(false);

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toEqual([]);
    expect(mockContext.esClient.asCurrentUser.security.getRole).not.toHaveBeenCalled();
  });

  it('does not return any deprecations if ML is not enabled', async () => {
    mockDeps.license.isEnabled.mockReturnValue(true);
    mockDeps.license.getFeatures.mockReturnValue({
      allowRbac: true,
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: true,
      allowAccessAgreement: true,
      allowAuditLogging: true,
      allowLegacyAuditLogging: true,
      allowSubFeaturePrivileges: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true,
      allowML: false,
    });

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toEqual([]);
    expect(mockContext.esClient.asCurrentUser.security.getRole).not.toHaveBeenCalled();
  });

  it('does not return any deprecations if none of the custom roles grant base privileges', async () => {
    mockContext.esClient.asCurrentUser.security.getRole.mockResolvedValue(
      securityMock.createApiResponse({ body: { roleA: createMockRole() } })
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

  it('returns deprecations even if cannot retrieve roles due to permission error', async () => {
    mockContext.esClient.asCurrentUser.security.getRole.mockRejectedValue(
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
                "title": "Access to Machine Learning features will be granted in 8.0",
              },
            ]
          `);
  });

  it('returns deprecations even if cannot retrieve roles due to unknown error', async () => {
    mockContext.esClient.asCurrentUser.security.getRole.mockRejectedValue(
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
                "title": "Access to Machine Learning features will be granted in 8.0",
              },
            ]
          `);
  });

  it('returns role-related deprecations', async () => {
    mockContext.esClient.asCurrentUser.security.getRole.mockResolvedValue(
      securityMock.createApiResponse({
        body: {
          roleA: createMockRole({
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['all'],
                resources: ['*'],
              },
            ],
          }),
          roleB: createMockRole({
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['space_all'],
                resources: ['space:b'],
              },
            ],
          }),
          roleC: createMockRole({
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['space_read'],
                resources: ['space:b'],
              },
            ],
          }),
          roleD: createMockRole({
            applications: [
              {
                // This shouldn't trigger a deprecation because of a mismatched applicaiton name
                application: 'NOT_kibana-.kibana',
                privileges: ['space_read'],
                resources: ['space:b'],
              },
            ],
          }),
          roleE: createMockRole({
            applications: [
              {
                // This shouldn't trigger a deprecation because feature privileges are granted instead
                application: 'kibana-.kibana',
                privileges: ['feature_discover.all'],
                resources: ['*'],
              },
            ],
          }),
        },
      })
    );

    await expect(deprecationHandler.getDeprecations(mockContext)).resolves.toMatchInlineSnapshot(`
            Array [
              Object {
                "correctiveActions": Object {
                  "manualSteps": Array [
                    "The following roles will grant access to Machine Learning features starting in 8.0. Update this role to grant access to specific features if you do not want to grant access to Machine Learning: roleA, roleB, roleC",
                  ],
                },
                "deprecationType": "feature",
                "level": "warning",
                "message": "Roles that grant \\"all\\" or \\"read\\" privileges to all features will include Machine Learning.",
                "title": "Access to Machine Learning features will be granted in 8.0",
              },
            ]
          `);
  });
});
