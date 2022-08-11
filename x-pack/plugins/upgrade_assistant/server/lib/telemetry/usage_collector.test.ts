/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { registerUpgradeAssistantUsageCollector } from './usage_collector';
import { IClusterClient } from '@kbn/core/server';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('Upgrade Assistant Usage Collector', () => {
  let makeUsageCollectorStub: any;
  let registerStub: any;
  let dependencies: any;
  let callClusterStub: any;
  let usageCollection: any;
  let clusterClient: IClusterClient;

  beforeEach(() => {
    clusterClient = elasticsearchServiceMock.createClusterClient();
    (clusterClient.asInternalUser.cluster.getSettings as jest.Mock).mockResolvedValue({
      persistent: {},
      transient: {
        logger: {
          deprecation: 'WARN',
        },
        cluster: {
          deprecation_indexing: {
            enabled: 'true',
          },
        },
      },
    });
    makeUsageCollectorStub = jest.fn();
    registerStub = jest.fn();
    usageCollection = {
      makeUsageCollector: makeUsageCollectorStub,
      registerCollector: registerStub,
    };
    dependencies = {
      usageCollection,
      elasticsearch: {
        client: clusterClient,
      },
    };
  });

  describe('registerUpgradeAssistantUsageCollector', () => {
    it('should registerCollector', () => {
      registerUpgradeAssistantUsageCollector(dependencies);
      expect(registerStub).toHaveBeenCalledTimes(1);
    });

    it('should call makeUsageCollector with type = upgrade-assistant', () => {
      registerUpgradeAssistantUsageCollector(dependencies);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('upgrade-assistant-telemetry');
    });

    it('fetchUpgradeAssistantMetrics should return correct info', async () => {
      registerUpgradeAssistantUsageCollector(dependencies);
      const upgradeAssistantStats = await makeUsageCollectorStub.mock.calls[0][0].fetch(
        callClusterStub
      );
      expect(upgradeAssistantStats).toEqual({
        features: {
          deprecation_logging: {
            enabled: true,
          },
        },
      });
    });
  });
});
