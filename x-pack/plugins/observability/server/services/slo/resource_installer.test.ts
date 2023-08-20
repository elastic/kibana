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
  SLO_INGEST_PIPELINE_NAME,
  SLO_RESOURCES_VERSION,
  SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_NAME,
  SLO_SUMMARY_INGEST_PIPELINE_NAME,
} from '../../assets/constants';
import { DefaultResourceInstaller } from './resource_installer';

describe('resourceInstaller', () => {
  describe('when the common resources are not installed yet', () => {
    it('installs the common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.getIndexTemplate.mockResponseOnce({ index_templates: [] });
      const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create());

      await installer.ensureCommonResourcesInstalled();

      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME })
      );
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: SLO_COMPONENT_TEMPLATE_SETTINGS_NAME })
      );
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ name: SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME })
      );
      expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({ name: SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME })
      );
      expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: SLO_INDEX_TEMPLATE_NAME })
      );
      expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: SLO_SUMMARY_INDEX_TEMPLATE_NAME })
      );

      expect(mockClusterClient.ingest.putPipeline).toHaveBeenCalledTimes(2);
      expect(mockClusterClient.ingest.putPipeline).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: SLO_INGEST_PIPELINE_NAME })
      );
      expect(mockClusterClient.ingest.putPipeline).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: SLO_SUMMARY_INGEST_PIPELINE_NAME })
      );
    });
  });

  describe('when the common resources are already installed', () => {
    it('skips the installation', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.getIndexTemplate.mockResponseOnce({
        index_templates: [
          {
            name: SLO_INDEX_TEMPLATE_NAME,
            index_template: {
              index_patterns: [],
              composed_of: [],
              _meta: { version: SLO_RESOURCES_VERSION },
            },
          },
        ],
      });
      mockClusterClient.indices.getIndexTemplate.mockResponseOnce({
        index_templates: [
          {
            name: SLO_SUMMARY_INDEX_TEMPLATE_NAME,
            index_template: {
              index_patterns: [],
              composed_of: [],
              _meta: { version: SLO_RESOURCES_VERSION },
            },
          },
        ],
      });
      mockClusterClient.ingest.getPipeline.mockResponseOnce({
        // @ts-ignore _meta not typed properly
        [SLO_INGEST_PIPELINE_NAME]: { _meta: { version: SLO_RESOURCES_VERSION } },
      });
      mockClusterClient.ingest.getPipeline.mockResponseOnce({
        // @ts-ignore _meta not typed properly
        [SLO_SUMMARY_INGEST_PIPELINE_NAME]: { _meta: { version: SLO_RESOURCES_VERSION } },
      });
      const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create());

      await installer.ensureCommonResourcesInstalled();

      expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(mockClusterClient.ingest.putPipeline).not.toHaveBeenCalled();
    });
  });
});
