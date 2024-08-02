/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { fetchInferenceEndpoints } from './fetch_inference_endpoints';

describe('fetch indices', () => {
  const mockInferenceEndpointsResponse = [
    {
      model_id: 'my-elser-model-03',
      task_type: 'sparse_embedding',
      service: 'elser',
      service_settings: { num_allocations: 1, num_threads: 1, model_id: '.elser_model_2' },
      task_settings: {},
    },
    {
      model_id: 'my-elser-model-04',
      task_type: 'sparse_embedding',
      service: 'elser',
      service_settings: { num_allocations: 1, num_threads: 1, model_id: '.elser_model_2' },
      task_settings: {},
    },
    {
      model_id: 'my-elser-model-05',
      task_type: 'sparse_embedding',
      service: 'elser',
      service_settings: { num_allocations: 1, num_threads: 1, model_id: '.elser_model_2' },
      task_settings: {},
    },
    {
      model_id: 'my-elser-model-06',
      task_type: 'sparse_embedding',
      service: 'elser',
      service_settings: { num_allocations: 1, num_threads: 1, model_id: '.elser_model_2' },
      task_settings: {},
    },
  ];
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClient = {
    asCurrentUser: {
      transport: {
        request: jest.fn(),
      },
    },
  };

  it('returns all inference endpoints', async () => {
    mockClient.asCurrentUser.transport.request.mockImplementationOnce(() => {
      return Promise.resolve({ endpoints: mockInferenceEndpointsResponse });
    });

    const indexData = await fetchInferenceEndpoints(
      mockClient.asCurrentUser as unknown as ElasticsearchClient
    );

    expect(indexData).toEqual({
      inferenceEndpoints: mockInferenceEndpointsResponse,
    });
  });
});
