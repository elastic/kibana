/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EntityDefinition } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { installBuiltInEntityDefinitions } from './install_entity_definition';
import { builtInServicesFromLogsEntityDefinition } from './built_in/services';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import {
  generateHistoryIngestPipelineId,
  generateHistoryTransformId,
  generateLatestIngestPipelineId,
  generateLatestTransformId,
} from './helpers/generate_component_id';
import { generateHistoryTransform } from './transform/generate_history_transform';
import { generateLatestTransform } from './transform/generate_latest_transform';

const assertHasCreatedDefinition = (
  definition: EntityDefinition,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  expect(soClient.create).toBeCalledTimes(1);
  expect(soClient.create).toBeCalledWith(SO_ENTITY_DEFINITION_TYPE, definition, {
    id: definition.id,
    overwrite: true,
  });

  expect(esClient.indices.putIndexTemplate).toBeCalledTimes(2);
  expect(esClient.indices.putIndexTemplate).toBeCalledWith(
    expect.objectContaining({
      name: `entities_v1_history_${definition.id}_index_template`,
    })
  );
  expect(esClient.indices.putIndexTemplate).toBeCalledWith(
    expect.objectContaining({
      name: `entities_v1_latest_${definition.id}_index_template`,
    })
  );

  expect(esClient.ingest.putPipeline).toBeCalledTimes(2);
  expect(esClient.ingest.putPipeline).toBeCalledWith({
    id: generateHistoryIngestPipelineId(builtInServicesFromLogsEntityDefinition),
    processors: expect.anything(),
    _meta: {
      definitionVersion: '0.1.0',
      managed: true,
    },
  });
  expect(esClient.ingest.putPipeline).toBeCalledWith({
    id: generateLatestIngestPipelineId(builtInServicesFromLogsEntityDefinition),
    processors: expect.anything(),
    _meta: {
      definitionVersion: '0.1.0',
      managed: true,
    },
  });

  expect(esClient.transform.putTransform).toBeCalledTimes(2);
  expect(esClient.transform.putTransform).toBeCalledWith(
    generateHistoryTransform(builtInServicesFromLogsEntityDefinition)
  );
  expect(esClient.transform.putTransform).toBeCalledWith(
    generateLatestTransform(builtInServicesFromLogsEntityDefinition)
  );
};

const assertHasStartedTransform = (definition: EntityDefinition, esClient: ElasticsearchClient) => {
  expect(esClient.transform.startTransform).toBeCalledTimes(2);
  expect(esClient.transform.startTransform).toBeCalledWith(
    {
      transform_id: generateHistoryTransformId(builtInServicesFromLogsEntityDefinition),
    },
    expect.anything()
  );
  expect(esClient.transform.startTransform).toBeCalledWith(
    {
      transform_id: generateLatestTransformId(builtInServicesFromLogsEntityDefinition),
    },
    expect.anything()
  );
};

const assertHasUninstalledDefinition = (
  definition: EntityDefinition,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  expect(esClient.transform.stopTransform).toBeCalledTimes(2);
  expect(esClient.transform.stopTransform).toBeCalledWith(
    expect.objectContaining({
      transform_id: generateHistoryTransformId(definition),
    }),
    expect.anything()
  );
  expect(esClient.transform.deleteTransform).toBeCalledWith(
    expect.objectContaining({
      transform_id: generateHistoryTransformId(definition),
    }),
    expect.anything()
  );
  expect(esClient.transform.stopTransform).toBeCalledWith(
    expect.objectContaining({
      transform_id: generateLatestTransformId(definition),
    }),
    expect.anything()
  );
  expect(esClient.transform.deleteTransform).toBeCalledWith(
    expect.objectContaining({
      transform_id: generateLatestTransformId(definition),
    }),
    expect.anything()
  );

  expect(esClient.transform.deleteTransform).toBeCalledTimes(2);
  expect(esClient.ingest.deletePipeline).toBeCalledTimes(2);
  expect(soClient.delete).toBeCalledTimes(1);

  expect(esClient.indices.deleteIndexTemplate).toBeCalledTimes(2);
  expect(esClient.indices.deleteIndexTemplate).toBeCalledWith(
    {
      name: `entities_v1_history_${definition.id}_index_template`,
    },
    { ignore: [404] }
  );
  expect(esClient.indices.deleteIndexTemplate).toBeCalledWith(
    {
      name: `entities_v1_latest_${definition.id}_index_template`,
    },
    { ignore: [404] }
  );
};

describe('install_entity_definition', () => {
  describe('installBuiltInEntityDefinitions', () => {
    it('should install and start definition when not found', async () => {
      const builtInDefinitions = [builtInServicesFromLogsEntityDefinition];
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10 });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        builtInDefinitions,
        logger: loggerMock.create(),
      });

      assertHasCreatedDefinition(builtInServicesFromLogsEntityDefinition, soClient, esClient);
      assertHasStartedTransform(builtInServicesFromLogsEntityDefinition, esClient);
    });

    it('should reinstall when partial state found', async () => {
      const builtInDefinitions = [builtInServicesFromLogsEntityDefinition];
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      // mock partially installed definition
      esClient.ingest.getPipeline.mockResolvedValue({});
      esClient.transform.getTransformStats.mockResolvedValue({ transforms: [], count: 0 });
      const soClient = savedObjectsClientMock.create();
      const definitionSOResult = {
        saved_objects: [
          {
            id: builtInServicesFromLogsEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: builtInServicesFromLogsEntityDefinition,
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      };
      soClient.find
        .mockResolvedValueOnce(definitionSOResult)
        .mockResolvedValueOnce(definitionSOResult)
        .mockResolvedValueOnce({
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: 10,
        });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        builtInDefinitions,
        logger: loggerMock.create(),
      });

      assertHasUninstalledDefinition(builtInServicesFromLogsEntityDefinition, soClient, esClient);
      assertHasCreatedDefinition(builtInServicesFromLogsEntityDefinition, soClient, esClient);
      assertHasStartedTransform(builtInServicesFromLogsEntityDefinition, esClient);
    });

    it('should start a stopped definition', async () => {
      const builtInDefinitions = [builtInServicesFromLogsEntityDefinition];
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      // mock installed but stopped definition
      esClient.ingest.getPipeline.mockResolvedValue({
        [generateHistoryIngestPipelineId(builtInServicesFromLogsEntityDefinition)]: {},
        [generateLatestIngestPipelineId(builtInServicesFromLogsEntityDefinition)]: {},
      });
      esClient.transform.getTransformStats.mockResolvedValue({
        // @ts-expect-error
        transforms: [{ state: 'stopped' }, { state: 'stopped' }],
        count: 2,
      });
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: builtInServicesFromLogsEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: builtInServicesFromLogsEntityDefinition,
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });
      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        builtInDefinitions,
        logger: loggerMock.create(),
      });

      expect(soClient.create).toHaveBeenCalledTimes(0);
      assertHasStartedTransform(builtInServicesFromLogsEntityDefinition, esClient);
    });
  });
});
