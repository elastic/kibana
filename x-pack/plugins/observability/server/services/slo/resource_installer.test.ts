/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SLO_INGEST_PIPELINE_NAME,
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_RESOURCES_VERSION,
} from '../../assets/constants';
import { DefaultResourceInstaller } from './resource_installer';

describe('resourceInstaller', () => {
  describe("when the common resources don't exist", () => {
    it('installs the common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.existsIndexTemplate.mockResponseOnce(false);
      const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create());

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
      expect(mockClusterClient.ingest.putPipeline).toHaveBeenCalledWith(
        expect.objectContaining({ id: SLO_INGEST_PIPELINE_NAME })
      );
    });
  });

  describe('when the common resources exist', () => {
    it('does not install the common resources', async () => {
      const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
      mockClusterClient.indices.existsIndexTemplate.mockResponseOnce(true);
      mockClusterClient.ingest.getPipeline.mockResponseOnce({
        // @ts-ignore _meta not typed properly
        [SLO_INGEST_PIPELINE_NAME]: { _meta: { version: SLO_RESOURCES_VERSION } },
      } as IngestGetPipelineResponse);
      const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create());

      await installer.ensureCommonResourcesInstalled();

      expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(mockClusterClient.ingest.putPipeline).not.toHaveBeenCalled();
    });
  });
});
