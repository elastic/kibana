/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subject, ReplaySubject } from 'rxjs';
import { ResourceInstaller } from './resource_installer';
import { loggerMock } from '@kbn/logging-mocks';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { Dataset } from './index_options';
import { IndexInfo } from './index_info';
import { elasticsearchServiceMock, ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';

describe('resourceInstaller', () => {
  let pluginStop$: Subject<void>;

  beforeEach(() => {
    pluginStop$ = new ReplaySubject(1);
  });

  afterEach(() => {
    pluginStop$.next();
    pluginStop$.complete();
  });

  describe('if write is disabled', () => {
    it('should not install common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));
      const installer = new ResourceInstaller({
        logger: loggerMock.create(),
        isWriteEnabled: false,
        disabledRegistrationContexts: [],
        getResourceName: jest.fn(),
        getClusterClient,
        pluginStop$,
      });
      installer.installCommonResources();
      expect(getClusterClient).not.toHaveBeenCalled();
    });

    it('should not install index level resources', () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));

      const installer = new ResourceInstaller({
        logger: loggerMock.create(),
        isWriteEnabled: false,
        disabledRegistrationContexts: [],
        getResourceName: jest.fn(),
        getClusterClient,
        pluginStop$,
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
      const indexInfo = new IndexInfo({ indexOptions, kibanaVersion: '8.1.0' });

      installer.installIndexLevelResources(indexInfo);
      expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    });
  });

  describe('if write is enabled', () => {
    it('should install common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));
      const getResourceNameMock = jest
        .fn()
        .mockReturnValueOnce(DEFAULT_ILM_POLICY_ID)
        .mockReturnValueOnce(TECHNICAL_COMPONENT_TEMPLATE_NAME)
        .mockReturnValueOnce(ECS_COMPONENT_TEMPLATE_NAME);
      const installer = new ResourceInstaller({
        logger: loggerMock.create(),
        isWriteEnabled: true,
        disabledRegistrationContexts: [],
        getResourceName: getResourceNameMock,
        getClusterClient,
        pluginStop$,
      });

      await installer.installCommonResources();

      expect(mockClusterClient.ilm.putLifecycle).toHaveBeenCalled();
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: TECHNICAL_COMPONENT_TEMPLATE_NAME })
      );
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: ECS_COMPONENT_TEMPLATE_NAME })
      );
    });
    it('should install index level resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      const getClusterClient = jest.fn(() => Promise.resolve(mockClusterClient));
      const installer = new ResourceInstaller({
        logger: loggerMock.create(),
        isWriteEnabled: true,
        disabledRegistrationContexts: [],
        getResourceName: jest.fn(),
        getClusterClient,
        pluginStop$,
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
      const indexInfo = new IndexInfo({ indexOptions, kibanaVersion: '8.1.0' });

      await installer.installIndexLevelResources(indexInfo);
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: '.alerts-observability.logs.alerts-mappings' })
      );
    });
  });

  // These tests only test the updateAliasWriteIndexMapping()
  // method of ResourceInstaller, however to test that, you
  // have to call installAndUpdateNamespaceLevelResources().
  // So there's a bit of setup.  But the only real difference
  // with the tests is what the es client simulateIndexTemplate()
  // mock returns, as set in the test.
  describe('updateAliasWriteIndexMapping()', () => {
    const SimulateTemplateResponse = {
      template: {
        aliases: {
          alias_name_1: {
            is_hidden: true,
          },
          alias_name_2: {
            is_hidden: true,
          },
        },
        mappings: { enabled: false },
        settings: {},
      },
    };

    const GetAliasResponse = {
      real_index: {
        aliases: {
          alias_1: {
            is_hidden: true,
          },
          alias_2: {
            is_hidden: true,
          },
        },
      },
    };

    function setup(mockClusterClient: ElasticsearchClientMock) {
      mockClusterClient.indices.simulateTemplate.mockImplementation(
        async () => SimulateTemplateResponse
      );
      mockClusterClient.indices.getAlias.mockImplementation(async () => GetAliasResponse);

      const logger = loggerMock.create();
      const resourceInstallerParams = {
        logger,
        isWriteEnabled: true,
        disabledRegistrationContexts: [],
        getResourceName: jest.fn(),
        getClusterClient: async () => mockClusterClient,
        pluginStop$,
      };
      const indexOptions = {
        feature: AlertConsumers.OBSERVABILITY,
        registrationContext: 'observability.metrics',
        dataset: Dataset.alerts,
        componentTemplateRefs: [],
        componentTemplates: [
          {
            name: 'mappings',
          },
        ],
      };

      const installer = new ResourceInstaller(resourceInstallerParams);
      const indexInfo = new IndexInfo({ indexOptions, kibanaVersion: '8.4.0' });

      return { installer, indexInfo, logger };
    }

    it('succeeds on the happy path', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.simulateIndexTemplate.mockImplementation(
        async () => SimulateTemplateResponse
      );

      const { installer, indexInfo } = setup(mockClusterClient);

      let error: string | undefined;
      try {
        await installer.installAndUpdateNamespaceLevelResources(indexInfo, 'default');
      } catch (err) {
        error = err.message;
      }
      expect(error).toBeFalsy();
    });

    it('gracefully fails on error simulating mappings', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.simulateIndexTemplate.mockImplementation(async () => {
        throw new Error('expecting simulateIndexTemplate() to throw');
      });

      const { installer, indexInfo, logger } = setup(mockClusterClient);

      let error: string | undefined;
      try {
        await installer.installAndUpdateNamespaceLevelResources(indexInfo, 'default');
      } catch (err) {
        error = err.message;
      }
      expect(error).toBeFalsy();

      const errorMessages = loggerMock.collect(logger).error;
      expect(errorMessages).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignored PUT mappings for alias alias_1; error generating simulated mappings: expecting simulateIndexTemplate() to throw",
          ],
          Array [
            "Ignored PUT mappings for alias alias_2; error generating simulated mappings: expecting simulateIndexTemplate() to throw",
          ],
        ]
      `);
    });

    it('gracefully fails on empty mappings', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.simulateIndexTemplate.mockImplementation(async () => ({}));

      const { installer, indexInfo, logger } = setup(mockClusterClient);

      let error: string | undefined;
      try {
        await installer.installAndUpdateNamespaceLevelResources(indexInfo, 'default');
      } catch (err) {
        error = err.message;
      }
      expect(error).toBeFalsy();
      const errorMessages = loggerMock.collect(logger).error;
      expect(errorMessages).toMatchInlineSnapshot(`
        Array [
          Array [
            "Ignored PUT mappings for alias alias_1; simulated mappings were empty",
          ],
          Array [
            "Ignored PUT mappings for alias alias_2; simulated mappings were empty",
          ],
        ]
      `);
    });
  });
});
