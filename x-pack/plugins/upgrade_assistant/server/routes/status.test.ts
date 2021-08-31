/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerUpgradeStatusRoute } from './status';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

// Need to require to get mock on named export to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ESUpgradeStatusApis = require('../lib/es_deprecations_status');
ESUpgradeStatusApis.getESUpgradeStatus = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const KibanaUpgradeStatusApis = require('../lib/kibana_status');
KibanaUpgradeStatusApis.getKibanaUpgradeStatus = jest.fn();

describe('Status API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      router: mockRouter,
    };
    registerUpgradeStatusRoute(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/status', () => {
    it('returns readyForUpgrade === false if Kibana or ES contain critical deprecations', async () => {
      ESUpgradeStatusApis.getESUpgradeStatus.mockResolvedValue({
        cluster: [
          {
            level: 'critical',
            message:
              'model snapshot [1] for job [deprecation_check_job] needs to be deleted or upgraded',
            details:
              'model snapshot [%s] for job [%s] supports minimum version [%s] and needs to be at least [%s]',
            url: 'doc_url',
            correctiveAction: {
              type: 'mlSnapshot',
              snapshotId: '1',
              jobId: 'deprecation_check_job',
            },
          },
        ],
        indices: [],
        totalCriticalDeprecations: 1,
      });

      KibanaUpgradeStatusApis.getKibanaUpgradeStatus.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'You have 1 Elasticsearch deprecation issues and 1 Kibana deprecation issues that must be resolved before upgrading.',
      });
    });

    it('returns readyForUpgrade === true if there are no critical deprecations', async () => {
      ESUpgradeStatusApis.getESUpgradeStatus.mockResolvedValue({
        cluster: [],
        indices: [],
        totalCriticalDeprecations: 0,
      });

      KibanaUpgradeStatusApis.getKibanaUpgradeStatus.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation issues have been resolved.',
      });
    });

    it('returns an error if it throws', async () => {
      ESUpgradeStatusApis.getESUpgradeStatus.mockRejectedValue(new Error('test error'));

      KibanaUpgradeStatusApis.getKibanaUpgradeStatus.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/status',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('test error');
    });
  });
});
