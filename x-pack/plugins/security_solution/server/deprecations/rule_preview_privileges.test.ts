/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from 'src/core/server/mocks';
import { RegisterDeprecationsConfig } from 'src/core/server';
import { registerRulePreviewPrivilegeDeprecations } from './rule_preview_privileges';
import { getRoleMock, getContextMock } from './utils.mock';

const getDependenciesMock = () => ({
  deprecationsService: deprecationsServiceMock.createSetupContract(),
  getKibanaRoles: jest.fn(),
  packageInfo: {
    branch: 'some-branch',
    buildSha: 'deadbeef',
    dist: true,
    version: '7.16.0',
    buildNum: 1,
  },
  applicationName: 'kibana-.kibana',
});

describe('rule preview privileges deprecation', () => {
  describe('deprecation handler', () => {
    let mockDependencies: ReturnType<typeof getDependenciesMock>;
    let mockContext: ReturnType<typeof getContextMock>;
    let deprecationHandler: RegisterDeprecationsConfig;

    beforeEach(() => {
      mockContext = getContextMock();
      mockDependencies = getDependenciesMock();
      registerRulePreviewPrivilegeDeprecations(mockDependencies);

      expect(mockDependencies.deprecationsService.registerDeprecations).toHaveBeenCalledTimes(1);
      deprecationHandler =
        mockDependencies.deprecationsService.registerDeprecations.mock.calls[0][0];
    });

    it('returns errors from getKibanaRoles', async () => {
      const errorResponse = {
        errors: [
          {
            correctiveActions: {
              manualSteps: [
                "A user with the 'manage_security' cluster privilege is required to perform this check.",
              ],
            },
            level: 'fetch_error',
            message: 'Error retrieving roles for privilege deprecations: Test error',
            title: 'Error in privilege deprecations services',
          },
        ],
      };
      mockDependencies.getKibanaRoles.mockResolvedValue(errorResponse);
      const result = await deprecationHandler.getDeprecations(mockContext);
      expect(result).toEqual([
        {
          correctiveActions: {
            manualSteps: [
              "A user with the 'manage_security' cluster privilege is required to perform this check.",
            ],
          },
          level: 'fetch_error',
          message: 'Error retrieving roles for privilege deprecations: Test error',
          title: 'Error in privilege deprecations services',
        },
      ]);
    });

    it('returns no deprecation if no roles are found', async () => {
      mockDependencies.getKibanaRoles.mockResolvedValue({
        roles: [],
      });
      const result = await deprecationHandler.getDeprecations(mockContext);
      expect(result).toEqual([]);
    });

    it('returns no deprecation when a role also has read access to the previews index', async () => {
      mockDependencies.getKibanaRoles.mockResolvedValue({
        roles: [
          getRoleMock(
            [
              {
                names: ['other-index', '.siem-signals-*', '.preview.alerts-security.alerts-*'],
                privileges: ['all'],
              },
            ],
            'roleWithCorrectAccess'
          ),
        ],
      });
      const result = await deprecationHandler.getDeprecations(mockContext);
      expect(result).toEqual([]);
    });

    it('returns no deprecation if all roles found are internal', async () => {
      const internalRoleMock = {
        ...getRoleMock(
          [
            {
              names: ['other-index', '.siem-signals-*'],
              privileges: ['all'],
            },
          ],
          'internalRole'
        ),
        metadata: {
          _reserved: true,
        },
      };
      mockDependencies.getKibanaRoles.mockResolvedValue({
        roles: [internalRoleMock],
      });
      const result = await deprecationHandler.getDeprecations(mockContext);
      expect(result).toEqual([]);
    });

    it('returns an appropriate deprecation if roles are found', async () => {
      mockDependencies.getKibanaRoles.mockResolvedValue({
        roles: [
          getRoleMock(
            [
              {
                names: ['other-index', 'second-index'],
                privileges: ['all'],
              },
            ],
            'irrelevantRole'
          ),
          getRoleMock(
            [
              {
                names: ['other-index', '.siem-signals-*', '.preview.alerts-security.alerts-*'],
                privileges: ['all'],
              },
            ],
            'roleWithCorrectAccess'
          ),
          getRoleMock(
            [
              {
                names: ['other-index', '.siem-signals-*'],
                privileges: ['all'],
              },
            ],
            'relevantRole'
          ),
        ],
      });
      const result = await deprecationHandler.getDeprecations(mockContext);
      expect(result).toEqual([
        {
          correctiveActions: {
            manualSteps: [
              'Update your roles to include read privileges for the detection alerts preview indices appropriate for that role and space(s).',
              'In 8.0, users will be unable to view preview results until those permissions are added.',
              'The roles that currently have read access to detection alerts indices are: relevantRole',
            ],
          },
          deprecationType: 'feature',
          documentationUrl:
            'https://www.elastic.co/guide/en/security/some-branch/rules-ui-create.html#preview-rules',
          level: 'warning',
          message:
            'In order to enable a more robust preview in 8.0+, users will need read privileges to new detection alerts preview indices (.preview.alerts-security.alerts-<KIBANA_SPACE>), analogous to existing detection alerts indices (.siem-signals-<KIBANA_SPACE>).',
          title: 'The Detections Rule Preview feature is changing',
        },
      ]);
    });
  });
});
