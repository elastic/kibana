/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceInstaller } from './resource_installer';
import { loggerMock } from '@kbn/logging-mocks';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { Dataset } from './index_options';
import { IndexInfo } from './index_info';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';

describe('resourceInstaller', () => {
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
});
