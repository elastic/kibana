/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
} from '../../assets/common';
import { ResourceInstaller } from './resource_installer';

describe('resourceInstaller', () => {
  describe("when the common resources don't exist", () => {
    it('installs the common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.existsIndexTemplate.mockResponseOnce(false);
      const installer = new ResourceInstaller(mockClusterClient, loggerMock.create());

      await installer.ensureCommonResourcesInstalled();

      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME })
      );
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: SLO_COMPONENT_TEMPLATE_SETTINGS_NAME })
      );
      expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: SLO_INDEX_TEMPLATE_NAME })
      );
    });

    it('fails when common resources installation take too long', async () => {
      const TIMEOUT = 1;
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.existsIndexTemplate.mockResponseOnce(false);
      mockClusterClient.cluster.putComponentTemplate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve, TIMEOUT * 2000);
          })
      );
      const installer = new ResourceInstaller(mockClusterClient, loggerMock.create(), {
        installationTimeout: TIMEOUT,
      });

      await expect(installer.ensureCommonResourcesInstalled()).rejects.toThrowError(
        'Failure installing resources shared between all SLO indices. Timeout: it took more than 1ms'
      );
    });
  });

  describe('when the common resources exist', () => {
    it('does not install the common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.existsIndexTemplate.mockResponseOnce(true);
      const installer = new ResourceInstaller(mockClusterClient, loggerMock.create());

      await installer.ensureCommonResourcesInstalled();

      expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });
  });
});
