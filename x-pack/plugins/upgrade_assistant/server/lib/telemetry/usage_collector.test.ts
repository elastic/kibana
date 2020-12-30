/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { registerUpgradeAssistantUsageCollector } from './usage_collector';
import { ILegacyClusterClient } from 'src/core/server';

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
  let clusterClient: ILegacyClusterClient;

  beforeEach(() => {
    clusterClient = elasticsearchServiceMock.createLegacyClusterClient();
    (clusterClient.callAsInternalUser as jest.Mock).mockResolvedValue({
      persistent: {},
      transient: {
        logger: {
          deprecation: 'WARN',
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
      savedObjects: {
        createInternalRepository: jest.fn().mockImplementation(() => {
          return {
            get: () => {
              return {
                attributes: {
                  'ui_open.overview': 10,
                  'ui_open.cluster': 20,
                  'ui_open.indices': 30,
                  'ui_reindex.close': 1,
                  'ui_reindex.open': 4,
                  'ui_reindex.start': 2,
                  'ui_reindex.stop': 1,
                  'ui_reindex.not_defined': 1,
                },
              };
            },
          };
        }),
      },
      elasticsearch: {
        legacy: { client: clusterClient },
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
        ui_open: {
          overview: 10,
          cluster: 20,
          indices: 30,
        },
        ui_reindex: {
          close: 1,
          open: 4,
          start: 2,
          stop: 1,
        },
        features: {
          deprecation_logging: {
            enabled: true,
          },
        },
      });
    });
  });
});
