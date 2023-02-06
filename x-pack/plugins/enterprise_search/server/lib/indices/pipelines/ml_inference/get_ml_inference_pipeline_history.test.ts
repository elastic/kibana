/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { MlInferenceHistoryResponse } from '../../../../../common/types/pipelines';

import { fetchMlInferencePipelineHistory } from './get_ml_inference_pipeline_history';

const DEFAULT_RESPONSE: SearchResponse = {
  _shards: {
    failed: 0,
    skipped: 0,
    successful: 1,
    total: 1,
  },
  hits: {
    hits: [],
    max_score: null,
    total: {
      relation: 'eq' as 'eq',
      value: 10,
    },
  },
  timed_out: false,
  took: 1,
};
type HistorySearchResponse = SearchResponse<
  unknown,
  {
    inference_processors: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
  }
>;
const emptyMockResponse: HistorySearchResponse = {
  ...DEFAULT_RESPONSE,
  aggregations: {
    inference_processors: {
      buckets: [],
    },
  },
};
const listMockResponse: HistorySearchResponse = {
  ...DEFAULT_RESPONSE,
  aggregations: {
    inference_processors: {
      buckets: [
        {
          doc_count: 20,
          key: 'ml-inference-test-001',
        },
        {
          doc_count: 33,
          key: 'ml-inference-test-002',
        },
      ],
    },
  },
};
const objectMockResponse: HistorySearchResponse = {
  ...DEFAULT_RESPONSE,
  aggregations: {
    inference_processors: {
      buckets: {
        '11111': {
          doc_count: 20,
          key: 'ml-inference-test-001',
        },
        '22222': {
          doc_count: 33,
          key: 'ml-inference-test-002',
        },
      },
    },
  },
};

const expectedMockResults: MlInferenceHistoryResponse = {
  history: [
    {
      doc_count: 20,
      pipeline: 'ml-inference-test-001',
    },
    {
      doc_count: 33,
      pipeline: 'ml-inference-test-002',
    },
  ],
};

describe('fetchMlInferencePipelineHistory', () => {
  const mockClient = {
    search: jest.fn(),
  };
  const client = mockClient as unknown as ElasticsearchClient;
  const indexName = 'unit-test-index';
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should query ingest pipelines from documents', async () => {
    mockClient.search.mockResolvedValue(emptyMockResponse);

    await fetchMlInferencePipelineHistory(client, indexName);
    expect(mockClient.search).toHaveBeenCalledWith({
      aggs: {
        inference_processors: {
          terms: {
            field: '_ingest.processors.pipeline.enum',
            size: 100,
          },
        },
      },
      index: indexName,
      size: 0,
    });
  });
  it('should return empty history when no results found', async () => {
    mockClient.search.mockResolvedValue(emptyMockResponse);

    const response = await fetchMlInferencePipelineHistory(client, indexName);
    expect(response).toEqual({ history: [] });
  });
  it('should return empty history when no aggregations returned', async () => {
    mockClient.search.mockResolvedValue(DEFAULT_RESPONSE);

    const response = await fetchMlInferencePipelineHistory(client, indexName);
    expect(response).toEqual({ history: [] });
  });
  it('should return history with aggregated list', async () => {
    mockClient.search.mockResolvedValue(listMockResponse);

    const response = await fetchMlInferencePipelineHistory(client, indexName);
    expect(response).toEqual(expectedMockResults);
  });
  it('should return history with aggregated object', async () => {
    mockClient.search.mockResolvedValue(objectMockResponse);

    const response = await fetchMlInferencePipelineHistory(client, indexName);
    expect(response).toEqual(expectedMockResults);
  });
});
