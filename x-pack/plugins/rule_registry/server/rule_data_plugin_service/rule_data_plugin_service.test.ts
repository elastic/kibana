/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { RuleDataService } from './rule_data_plugin_service';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { Dataset } from './index_options';
import { RuleDataClient } from '../rule_data_client/rule_data_client';
import { createRuleDataClientMock as mockCreateRuleDataClient } from '../rule_data_client/rule_data_client.mock';

jest.mock('../rule_data_client/rule_data_client', () => ({
  RuleDataClient: jest.fn().mockImplementation(() => mockCreateRuleDataClient()),
}));

describe('ruleDataPluginService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isRegistrationContextDisabled', () => {
    it('should return true', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));

      const ruleDataService = new RuleDataService({
        logger: loggerMock.create(),
        getClusterClient,
        kibanaVersion: '8.1.0',
        isWriteEnabled: true,
        disabledRegistrationContexts: ['observability.logs'],
        isWriterCacheEnabled: true,
      });
      expect(ruleDataService.isRegistrationContextDisabled('observability.logs')).toBe(true);
    });

    it('should return false', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));

      const ruleDataService = new RuleDataService({
        logger: loggerMock.create(),
        getClusterClient,
        kibanaVersion: '8.1.0',
        isWriteEnabled: true,
        disabledRegistrationContexts: ['observability.logs'],
        isWriterCacheEnabled: true,
      });
      expect(ruleDataService.isRegistrationContextDisabled('observability.apm')).toBe(false);
    });
  });

  describe('isWriteEnabled', () => {
    it('should return true', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));

      const ruleDataService = new RuleDataService({
        logger: loggerMock.create(),
        getClusterClient,
        kibanaVersion: '8.1.0',
        isWriteEnabled: true,
        disabledRegistrationContexts: ['observability.logs'],
        isWriterCacheEnabled: true,
      });

      expect(ruleDataService.isWriteEnabled('observability.logs')).toBe(false);
    });
  });

  describe('initializeIndex', () => {
    it('calls RuleDataClient', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));

      const ruleDataService = new RuleDataService({
        logger: loggerMock.create(),
        getClusterClient,
        kibanaVersion: '8.1.0',
        isWriteEnabled: true,
        disabledRegistrationContexts: ['observability.logs'],
        isWriterCacheEnabled: true,
      });
      const indexOptions = {
        feature: AlertConsumers.LOGS,
        registrationContext: 'observability.logs',
        dataset: Dataset.alerts,
        componentTemplateRefs: [],
        componentTemplates: [
          {
            name: 'mappings',
          },
        ],
      };
      await ruleDataService.initializeService();
      await ruleDataService.initializeIndex(indexOptions);
      expect(RuleDataClient).toHaveBeenCalled();
      expect(RuleDataClient).toHaveBeenCalledWith(
        expect.objectContaining({
          indexInfo: expect.objectContaining({ baseName: '.alerts-observability.logs.alerts' }),
        })
      );
    });
  });
});
