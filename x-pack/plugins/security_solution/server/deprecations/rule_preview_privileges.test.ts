/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deprecationsServiceMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';
import { RegisterDeprecationsConfig } from 'src/core/server';
import { Role } from '../../../security/common/model';
import {
  registerRulePreviewPrivilegeDeprecations,
  roleHasSignalsReadAccess,
} from './rule_preview_privileges';

const emptyRole: Role = {
  name: 'mockRole',
  metadata: { _reserved: false },
  elasticsearch: { cluster: [], indices: [], run_as: [] },
  kibana: [{ spaces: [], base: [], feature: {} }],
};

const getRoleMock = (
  indicesOverrides: Role['elasticsearch']['indices'] = [],
  name = 'mockRole'
): Role => ({
  ...emptyRole,
  name,
  elasticsearch: {
    ...emptyRole.elasticsearch,
    indices: indicesOverrides,
  },
});

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

const getContextMock = () => ({
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
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

    it('returns an appropriate deprecation if no roles are found', async () => {
      mockDependencies.getKibanaRoles.mockResolvedValue({
        roles: [],
      });
      const result = await deprecationHandler.getDeprecations(mockContext);
      expect(result).toEqual([
        {
          correctiveActions: {
            manualSteps: [
              'Update your roles to include read privileges for the signals preview indices appropriate for that role and space(s).',
              'In 8.0, users will be unable to view preview results until those permissions are added.',
            ],
          },
          deprecationType: 'feature',
          documentationUrl:
            'https://www.elastic.co/guide/en/security/some-branch/rules-ui-create.html#preview-rules',
          level: 'warning',
          message:
            'In order to enable a more robust preview, users will need read privileges to new signals preview indices (.siem-preview-signals-<KIBANA_SPACE>), analogous to existing signals indices (.siem-signals-<KIBANA_SPACE>).',
          title: 'The Detections Rule Preview feature is changing',
        },
      ]);
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
              'Update your roles to include read privileges for the signals preview indices appropriate for that role and space(s).',
              'In 8.0, users will be unable to view preview results until those permissions are added.',
              'The roles that currently have read access to signals indices are: relevantRole',
            ],
          },
          deprecationType: 'feature',
          documentationUrl:
            'https://www.elastic.co/guide/en/security/some-branch/rules-ui-create.html#preview-rules',
          level: 'warning',
          message:
            'In order to enable a more robust preview, users will need read privileges to new signals preview indices (.siem-preview-signals-<KIBANA_SPACE>), analogous to existing signals indices (.siem-signals-<KIBANA_SPACE>).',
          title: 'The Detections Rule Preview feature is changing',
        },
      ]);
    });
  });

  describe('utilities', () => {
    describe('roleHasSignalsReadAccess', () => {
      it('returns true if the role has read privilege to all signals indexes', () => {
        const role = getRoleMock([
          {
            names: ['.siem-signals-*'],
            privileges: ['read'],
          },
        ]);
        expect(roleHasSignalsReadAccess(role)).toEqual(true);
      });

      it('returns true if the role has read privilege to a single signals index', () => {
        const role = getRoleMock([
          {
            names: ['.siem-signals-spaceId'],
            privileges: ['read'],
          },
        ]);
        expect(roleHasSignalsReadAccess(role)).toEqual(true);
      });

      it('returns true if the role has all privilege to a single signals index', () => {
        const role = getRoleMock([
          {
            names: ['.siem-signals-spaceId', 'other-index'],
            privileges: ['all'],
          },
        ]);
        expect(roleHasSignalsReadAccess(role)).toEqual(true);
      });

      it('returns false if the role has read privilege to other indices', () => {
        const role = getRoleMock([
          {
            names: ['other-index'],
            privileges: ['read'],
          },
        ]);
        expect(roleHasSignalsReadAccess(role)).toEqual(false);
      });

      it('returns false if the role has all privilege to other indices', () => {
        const role = getRoleMock([
          {
            names: ['other-index', 'second-index'],
            privileges: ['all'],
          },
        ]);
        expect(roleHasSignalsReadAccess(role)).toEqual(false);
      });

      it('returns false if the role has no specific privileges', () => {
        const role = getRoleMock();
        expect(roleHasSignalsReadAccess(role)).toEqual(false);
      });
    });
  });
});
