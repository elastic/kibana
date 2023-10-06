/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from 'langchain/document';
import { ElasticsearchStore } from './elasticsearch_store';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  IndicesCreateResponse,
  MlGetTrainedModelsResponse,
} from '@elastic/elasticsearch/lib/api/types';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('@kbn/core/server', () => ({
  ElasticsearchClient: jest.fn(),
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  })),
}));

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggingSystemMock.createLogger();
const KB_INDEX = '.elastic-assistant-kb';

const getElasticsearchStore = () => {
  return new ElasticsearchStore(mockEsClient, KB_INDEX, mockLogger);
};

describe('ElasticsearchStore', () => {
  let esStore: ElasticsearchStore;

  beforeEach(() => {
    esStore = getElasticsearchStore();
    jest.clearAllMocks();
  });

  describe('Index Management', () => {
    it('Checks if index exists', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);

      const exists = await esStore.indexExists();

      expect(exists).toBe(true);
      expect(mockEsClient.indices.exists).toHaveBeenCalledWith({ index: KB_INDEX });
    });

    it('Creates an index', async () => {
      mockEsClient.indices.create.mockResolvedValue({
        acknowledged: true,
      } as IndicesCreateResponse);

      const created = await esStore.createIndex();

      expect(created).toBe(true);
      expect(mockEsClient.indices.create).toHaveBeenCalledWith({
        index: KB_INDEX,
        mappings: { properties: { vector: { properties: { tokens: { type: 'rank_features' } } } } },
        settings: { default_pipeline: '.kibana-elastic-ai-assistant-kb-ingest-pipeline' },
      });
    });

    it('Deletes an index', async () => {
      mockEsClient.indices.delete.mockResolvedValue({ acknowledged: true });

      const deleted = await esStore.deleteIndex();

      expect(deleted).toBe(true);
      expect(mockEsClient.indices.delete).toHaveBeenCalledWith({ index: KB_INDEX });
    });
  });

  describe('Pipeline Management', () => {
    it('Checks if pipeline exists', async () => {
      mockEsClient.ingest.getPipeline.mockResolvedValue({});

      const exists = await esStore.pipelineExists();

      expect(exists).toBe(false);
      expect(mockEsClient.ingest.getPipeline).toHaveBeenCalledWith({
        id: '.kibana-elastic-ai-assistant-kb-ingest-pipeline',
      });
    });

    it('Creates an ingest pipeline', async () => {
      mockEsClient.ingest.putPipeline.mockResolvedValue({ acknowledged: true });

      const created = await esStore.createPipeline();

      expect(created).toBe(true);
      expect(mockEsClient.ingest.putPipeline).toHaveBeenCalledWith({
        description: 'Embedding pipeline for Elastic AI Assistant ELSER Knowledge Base',
        id: '.kibana-elastic-ai-assistant-kb-ingest-pipeline',
        processors: [
          {
            inference: {
              field_map: { text: 'text_field' },
              inference_config: { text_expansion: { results_field: 'tokens' } },
              model_id: '.elser_model_2',
              target_field: 'vector',
            },
          },
        ],
      });
    });

    it('Deletes an ingest pipeline', async () => {
      mockEsClient.ingest.deletePipeline.mockResolvedValue({ acknowledged: true });

      const deleted = await esStore.deletePipeline();

      expect(deleted).toBe(true);
      expect(mockEsClient.ingest.deletePipeline).toHaveBeenCalledWith({
        id: '.kibana-elastic-ai-assistant-kb-ingest-pipeline',
      });
    });
  });

  describe('Model Management', () => {
    it('Checks if a model is installed', async () => {
      mockEsClient.ml.getTrainedModels.mockResolvedValue({
        trained_model_configs: [{ fully_defined: true }],
      } as MlGetTrainedModelsResponse);

      const isInstalled = await esStore.isModelInstalled('.elser_model_2');

      expect(isInstalled).toBe(true);
      expect(mockEsClient.ml.getTrainedModels).toHaveBeenCalledWith({
        include: 'definition_status',
        model_id: '.elser_model_2',
      });
    });
  });

  describe('addDocuments', () => {
    it('Checks if documents are added', async () => {
      mockEsClient.bulk.mockResolvedValue({
        errors: false,
        took: 515,
        ingest_took: 4026,
        items: [
          {
            index: {
              _index: '.kibana-elastic-ai-assistant-kb',
              _id: 'be2584a9-ad2e-4f13-a11c-c0b79423079c',
              _version: 2,
              result: 'updated',
              forced_refresh: true,
              _shards: {
                total: 2,
                successful: 1,
                failed: 0,
              },
              _seq_no: 1,
              _primary_term: 1,
              status: 200,
            },
          },
        ],
      });

      const document = new Document({
        pageContent: 'interesting stuff',
        metadata: { source: '1' },
      });

      const docsInstalled = await esStore.addDocuments([document]);

      expect(docsInstalled).toStrictEqual(['be2584a9-ad2e-4f13-a11c-c0b79423079c']);
      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          {
            index: {
              _id: undefined,
              _index: '.elastic-assistant-kb',
            },
          },
          {
            metadata: {
              source: '1',
            },
            text: 'interesting stuff',
          },
        ],
        refresh: true,
      });
    });
  });

  describe('similaritySearch', () => {
    it('Checks if documents are found', async () => {
      const query = 'find the docs!';
      mockEsClient.search.mockResolvedValue({
        took: 3,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 129, relation: 'eq' },
          max_score: 17.86367,
          hits: [
            {
              _index: '.kibana-elastic-ai-assistant-kb',
              _id: 'b71ea007-8b46-4e02-81b4-485faad06e79',
              _score: 9.308316,
              _ignored: ['text.keyword'],
              _source: {
                metadata: {
                  source: '/found/in/test/land',
                },
                vector: {
                  tokens: {},
                  model_id: '.elser_model_2',
                },
                text: 'documents',
              },
            },
          ],
        },
      });

      const searchResults = await esStore.similaritySearch(query);

      expect(searchResults).toStrictEqual([
        new Document({
          pageContent: 'documents',
          metadata: { source: '/found/in/test/land' },
        }),
      ]);
      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: KB_INDEX,
        query: {
          bool: {
            must: [
              {
                text_expansion: {
                  'vector.tokens': {
                    model_id: '.elser_model_2',
                    model_text: query,
                  },
                },
              },
            ],
          },
        },
      });
    });
  });
});
