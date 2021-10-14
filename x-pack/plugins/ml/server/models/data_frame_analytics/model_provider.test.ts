/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelService, modelsProvider } from './models_provider';
import { IScopedClusterClient } from 'kibana/server';
import { MlClient } from '../../lib/ml_client';
import mockResponse from './__mocks__/mock_deployment_response.json';

describe('Model service', () => {
  const client = {} as jest.Mocked<IScopedClusterClient>;
  const mlClient = {
    getTrainedModelsDeploymentStats: jest.fn(() => {
      return Promise.resolve({ body: mockResponse });
    }),
  } as unknown as jest.Mocked<MlClient>;
  let service: ModelService;

  beforeEach(() => {
    service = modelsProvider(client, mlClient);
  });

  afterEach(() => {});

  it('extract nodes list correctly', async () => {
    expect(await service.getNodesOverview()).toEqual({
      count: 1,
      nodes: [
        {
          id: '8R0Oo3Y7RVGvgRMdYqPG2A',
          name: 'node-0',
          ephemeral_id: 'YYf8r2gVR1CR--1DwOMxCg',
          transport_address: '10.2.42.194:9300',
          attributes: {
            'ml.machine_memory': '34359738368',
            'xpack.installed': 'true',
            'ml.max_open_jobs': '512',
            'ml.max_jvm_size': '1073741824',
          },
          roles: [
            'data',
            'data_cold',
            'data_content',
            'data_frozen',
            'data_hot',
            'data_warm',
            'ingest',
            'master',
            'ml',
            'remote_cluster_client',
            'transform',
          ],
          allocated_models: [
            {
              allocation_status: {
                allocation_count: 1,
                state: 'fully_allocated',
                target_allocation_count: 1,
              },
              inference_threads: 1,
              model_id: 'dslim__bert-base-ner',
              model_size: '411.2mb',
              model_threads: 1,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 1,
                state: 'fully_allocated',
                target_allocation_count: 1,
              },
              inference_threads: 1,
              model_id: 'elastic__distilbert-base-uncased-finetuned-conll03-english',
              model_size: '253.3mb',
              model_threads: 1,
              state: 'started',
            },
          ],
        },
      ],
    });
  });
});
