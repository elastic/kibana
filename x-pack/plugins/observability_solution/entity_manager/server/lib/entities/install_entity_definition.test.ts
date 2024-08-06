/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EntityDefinition } from '@kbn/entities-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { installBuiltInEntityDefinitions } from './install_entity_definition';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import {
  generateHistoryIngestPipelineId,
  generateHistoryTransformId,
  generateLatestIngestPipelineId,
  generateLatestTransformId,
} from './helpers/generate_component_id';
import { generateHistoryTransform } from './transform/generate_history_transform';
import { generateLatestTransform } from './transform/generate_latest_transform';
import { entityDefinition as mockEntityDefinition } from './helpers/fixtures/entity_definition';

const assertHasCreatedDefinition = (
  definition: EntityDefinition,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  expect(soClient.create).toBeCalledTimes(1);
  expect(soClient.create).toBeCalledWith(
    SO_ENTITY_DEFINITION_TYPE,
    {
      ...definition,
      installStatus: 'installing',
      installStartedAt: expect.any(String),
    },
    {
      id: definition.id,
      overwrite: true,
      managed: definition.managed,
    }
  );

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
    id: generateHistoryIngestPipelineId(definition),
    processors: expect.anything(),
    _meta: {
      definitionVersion: definition.version,
      managed: definition.managed,
    },
  });
  expect(esClient.ingest.putPipeline).toBeCalledWith({
    id: generateLatestIngestPipelineId(definition),
    processors: expect.anything(),
    _meta: {
      definitionVersion: definition.version,
      managed: definition.managed,
    },
  });

  expect(esClient.transform.putTransform).toBeCalledTimes(2);
  expect(esClient.transform.putTransform).toBeCalledWith(generateHistoryTransform(definition));
  expect(esClient.transform.putTransform).toBeCalledWith(generateLatestTransform(definition));
};

const assertHasStartedTransform = (definition: EntityDefinition, esClient: ElasticsearchClient) => {
  expect(esClient.transform.startTransform).toBeCalledTimes(2);
  expect(esClient.transform.startTransform).toBeCalledWith(
    {
      transform_id: generateHistoryTransformId(definition),
    },
    expect.anything()
  );
  expect(esClient.transform.startTransform).toBeCalledWith(
    {
      transform_id: generateLatestTransformId(definition),
    },
    expect.anything()
  );
};

const assertHasDeletedTransforms = (
  definition: EntityDefinition,
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
};

describe('install_entity_definition', () => {
  describe('installBuiltInEntityDefinitions', () => {
    it('should install and start definition when not found', async () => {
      const builtInDefinitions = [mockEntityDefinition];
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 10 });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: builtInDefinitions,
        logger: loggerMock.create(),
      });

      assertHasCreatedDefinition(mockEntityDefinition, soClient, esClient);
      assertHasStartedTransform(mockEntityDefinition, esClient);
    });

    it('should reinstall when partial state found', async () => {
      const builtInDefinitions = [mockEntityDefinition];
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      // mock partially installed definition
      esClient.ingest.getPipeline.mockResolvedValue({});
      esClient.transform.getTransformStats.mockResolvedValue({ transforms: [], count: 0 });
      const soClient = savedObjectsClientMock.create();
      const definitionSOResult = {
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              installStatus: 'installed',
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      };

      soClient.find.mockResolvedValueOnce(definitionSOResult).mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10,
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: builtInDefinitions,
        logger: loggerMock.create(),
      });

      assertHasDeletedTransforms(mockEntityDefinition, esClient);
      assertHasCreatedDefinition(mockEntityDefinition, soClient, esClient);
      assertHasStartedTransform(mockEntityDefinition, esClient);
    });

    it('should reinstall when outdated version', async () => {
      const updatedDefinition = {
        ...mockEntityDefinition,
        version: semver.inc(mockEntityDefinition.version, 'major') ?? '0.0.0',
      };
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      const soClient = savedObjectsClientMock.create();
      const definitionSOResult = {
        saved_objects: [
          {
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              ...mockEntityDefinition,
              installStatus: 'installed',
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      };

      soClient.find.mockResolvedValueOnce(definitionSOResult).mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 10,
      });

      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: [updatedDefinition],
        logger: loggerMock.create(),
      });

      assertHasDeletedTransforms(mockEntityDefinition, esClient);
      assertHasCreatedDefinition(updatedDefinition, soClient, esClient);
      assertHasStartedTransform(updatedDefinition, esClient);
    });

    it('should start a stopped definition', async () => {
      const builtInDefinitions = [mockEntityDefinition];
      const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
      // mock installed but stopped definition
      esClient.ingest.getPipeline.mockResolvedValue({
        [generateHistoryIngestPipelineId(mockEntityDefinition)]: {},
        [generateLatestIngestPipelineId(mockEntityDefinition)]: {},
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
            id: mockEntityDefinition.id,
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: mockEntityDefinition,
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      });
      await installBuiltInEntityDefinitions({
        esClient,
        soClient,
        definitions: builtInDefinitions,
        logger: loggerMock.create(),
      });

      expect(soClient.create).toHaveBeenCalledTimes(0);
      assertHasStartedTransform(mockEntityDefinition, esClient);
    });
  });
});
