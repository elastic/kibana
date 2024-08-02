/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  IndicesCreateResponse,
  MlGetTrainedModelsStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { Document } from 'langchain/document';

import {
  ElasticsearchStore,
  FALLBACK_SIMILARITY_SEARCH_SIZE,
  TERMS_QUERY_SIZE,
} from './elasticsearch_store';
import { mockMsearchResponse } from '../../../__mocks__/msearch_response';
import { mockQueryText } from '../../../__mocks__/query_text';
import { coreMock } from '@kbn/core/server/mocks';
import {
  KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT,
  KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT,
} from '../../telemetry/event_based_telemetry';
import { Metadata } from '@kbn/elastic-assistant-common';

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
const reportEvent = jest.fn();
const mockTelemetry = { ...coreMock.createSetup().analytics, reportEvent };
const KB_INDEX = '.elastic-assistant-kb';

const getElasticsearchStore = () => {
  return new ElasticsearchStore(mockEsClient, KB_INDEX, mockLogger, mockTelemetry);
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
        mappings: {
          properties: {
            metadata: {
              properties: {
                kbResource: { type: 'keyword' },
                required: { type: 'boolean' },
                source: { type: 'keyword' },
              },
            },
            vector: { properties: { tokens: { type: 'rank_features' } } },
          },
        },
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

  describe('isModelInstalled', () => {
    it('returns true if model is started and fully allocated', async () => {
      mockEsClient.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              allocation_status: {
                state: 'fully_allocated',
              },
            },
          },
        ],
      } as MlGetTrainedModelsStatsResponse);

      const isInstalled = await esStore.isModelInstalled('.elser_model_2');

      expect(isInstalled).toBe(true);
      expect(mockEsClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
        model_id: '.elser_model_2',
      });
    });

    it('returns false if model is not started', async () => {
      mockEsClient.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'starting',
              allocation_status: {
                state: 'fully_allocated',
              },
            },
          },
        ],
      } as MlGetTrainedModelsStatsResponse);

      const isInstalled = await esStore.isModelInstalled('.elser_model_2');

      expect(isInstalled).toBe(false);
      expect(mockEsClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
        model_id: '.elser_model_2',
      });
    });

    it('returns false if model is not fully allocated', async () => {
      mockEsClient.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              allocation_status: {
                state: 'starting',
              },
            },
          },
        ],
      } as MlGetTrainedModelsStatsResponse);

      const isInstalled = await esStore.isModelInstalled('.elser_model_2');

      expect(isInstalled).toBe(false);
      expect(mockEsClient.ml.getTrainedModelsStats).toHaveBeenCalledWith({
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

      const document = new Document<Metadata>({
        pageContent: 'interesting stuff',
        metadata: { kbResource: 'esql', required: false, source: '1' },
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
              kbResource: 'esql',
              required: false,
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
      mockEsClient.msearch.mockResolvedValue(mockMsearchResponse);

      const searchResults = await esStore.similaritySearch(mockQueryText);

      expect(searchResults).toStrictEqual([
        {
          pageContent:
            "[[esql-from]]\n=== `FROM`\n\nThe `FROM` source command returns a table with up to 10,000 documents from a\ndata stream, index, or alias. Each row in the resulting table represents a\ndocument. Each column corresponds to a field, and can be accessed by the name\nof that field.\n\n[source,esql]\n----\nFROM employees\n----\n\nYou can use <<api-date-math-index-names,date math>> to refer to indices, aliases\nand data streams. This can be useful for time series data, for example to access\ntoday's index:\n\n[source,esql]\n----\nFROM <logs-{now/d}>\n----\n\nUse comma-separated lists or wildcards to query multiple data streams, indices,\nor aliases:\n\n[source,esql]\n----\nFROM employees-00001,employees-*\n----\n",
          metadata: {
            source:
              '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/documentation/source_commands/from.asciidoc',
          },
        },
        {
          pageContent:
            '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nFROM logs-*\n| WHERE NOT CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")\n| STATS destcount = COUNT(destination.ip) by user.name, host.name\n| ENRICH ldap_lookup_new ON user.name\n| WHERE group.name IS NOT NULL\n| EVAL follow_up = CASE(\n    destcount >= 100, "true",\n     "false")\n| SORT destcount desc\n| KEEP destcount, host.name, user.name, group.name, follow_up\n```\n',
          metadata: {
            source:
              '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0001.asciidoc',
          },
        },
      ]);

      expect(mockEsClient.msearch).toHaveBeenCalledWith({
        body: [
          {
            index: '.elastic-assistant-kb',
          },
          {
            query: {
              bool: {
                must_not: [
                  {
                    term: {
                      'metadata.kbResource': 'esql',
                    },
                  },
                  {
                    term: {
                      'metadata.required': true,
                    },
                  },
                ],
                must: [
                  {
                    text_expansion: {
                      'vector.tokens': {
                        model_id: '.elser_model_2',
                        model_text: mockQueryText,
                      },
                    },
                  },
                ],
              },
            },
            size: FALLBACK_SIMILARITY_SEARCH_SIZE, // <-- `FALLBACK_SIMILARITY_SEARCH_SIZE` is used when `k` is not provided
          },
          {
            index: '.elastic-assistant-kb',
          },
          {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'metadata.kbResource': 'esql',
                    },
                  },
                  {
                    term: {
                      'metadata.required': true,
                    },
                  },
                ],
              },
            },
            size: TERMS_QUERY_SIZE,
          },
        ],
      });
    });

    it('uses the value of `k` instead of the `FALLBACK_SIMILARITY_SEARCH_SIZE` when `k` is provided', async () => {
      mockEsClient.msearch.mockResolvedValue(mockMsearchResponse);

      const k = 4;
      await esStore.similaritySearch(mockQueryText, k);

      expect(mockEsClient.msearch).toHaveBeenCalledWith({
        body: [
          {
            index: '.elastic-assistant-kb',
          },
          {
            query: {
              bool: {
                must_not: [
                  {
                    term: {
                      'metadata.kbResource': 'esql',
                    },
                  },
                  {
                    term: {
                      'metadata.required': true,
                    },
                  },
                ],
                must: [
                  {
                    text_expansion: {
                      'vector.tokens': {
                        model_id: '.elser_model_2',
                        model_text: mockQueryText,
                      },
                    },
                  },
                ],
              },
            },
            size: k, // <-- `k` is used instead of `FALLBACK_SIMILARITY_SEARCH_SIZE`
          },
          {
            index: '.elastic-assistant-kb',
          },
          {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'metadata.kbResource': 'esql',
                    },
                  },
                  {
                    term: {
                      'metadata.required': true,
                    },
                  },
                ],
              },
            },
            size: TERMS_QUERY_SIZE,
          },
        ],
      });
    });

    it('Reports successful telemetry event', async () => {
      mockEsClient.msearch.mockResolvedValue(mockMsearchResponse);

      await esStore.similaritySearch(mockQueryText);

      expect(reportEvent).toHaveBeenCalledWith(KNOWLEDGE_BASE_EXECUTION_SUCCESS_EVENT.eventType, {
        model: '.elser_model_2',
        resourceAccessed: 'esql',
        responseTime: 142,
        resultCount: 2,
      });
    });

    it('Reports error telemetry event', async () => {
      mockEsClient.msearch.mockRejectedValue(new Error('Oh no!'));

      await esStore.similaritySearch(mockQueryText);

      expect(reportEvent).toHaveBeenCalledWith(KNOWLEDGE_BASE_EXECUTION_ERROR_EVENT.eventType, {
        model: '.elser_model_2',
        resourceAccessed: 'esql',
        errorMessage: 'Oh no!',
      });
    });
  });
});
