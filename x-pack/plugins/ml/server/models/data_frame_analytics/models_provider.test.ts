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
import { MemoryOverviewService } from '../memory_overview/memory_overview_service';

describe('Model service', () => {
  const client = {
    asCurrentUser: {
      nodes: {
        stats: jest.fn(() => {
          return Promise.resolve({
            body: {
              _nodes: {
                total: 3,
                successful: 3,
                failed: 0,
              },
              cluster_name: 'test_cluster',
              nodes: {
                '3qIoLFnbSi-DwVrYioUCdw': {
                  timestamp: 1635167166946,
                  name: 'node3',
                  transport_address: '10.10.10.2:9353',
                  host: '10.10.10.2',
                  ip: '10.10.10.2:9353',
                  roles: ['data', 'ingest', 'master', 'ml', 'transform'],
                  attributes: {
                    'ml.machine_memory': '15599742976',
                    'xpack.installed': 'true',
                    'ml.max_jvm_size': '1073741824',
                  },
                  os: {
                    mem: {
                      total_in_bytes: 15599742976,
                      adjusted_total_in_bytes: 15599742976,
                      free_in_bytes: 376324096,
                      used_in_bytes: 15223418880,
                      free_percent: 2,
                      used_percent: 98,
                    },
                  },
                },
                'DpCy7SOBQla3pu0Dq-tnYw': {
                  timestamp: 1635167166946,
                  name: 'node2',
                  transport_address: '10.10.10.2:9352',
                  host: '10.10.10.2',
                  ip: '10.10.10.2:9352',
                  roles: ['data', 'master', 'ml', 'transform'],
                  attributes: {
                    'ml.machine_memory': '15599742976',
                    'xpack.installed': 'true',
                    'ml.max_jvm_size': '1073741824',
                  },
                  os: {
                    timestamp: 1635167166959,
                    mem: {
                      total_in_bytes: 15599742976,
                      adjusted_total_in_bytes: 15599742976,
                      free_in_bytes: 376324096,
                      used_in_bytes: 15223418880,
                      free_percent: 2,
                      used_percent: 98,
                    },
                  },
                },
                'pt7s6lKHQJaP4QHKtU-Q0Q': {
                  timestamp: 1635167166945,
                  name: 'node1',
                  transport_address: '10.10.10.2:9351',
                  host: '10.10.10.2',
                  ip: '10.10.10.2:9351',
                  roles: ['data', 'master', 'ml'],
                  attributes: {
                    'ml.machine_memory': '15599742976',
                    'xpack.installed': 'true',
                    'ml.max_jvm_size': '1073741824',
                  },
                  os: {
                    timestamp: 1635167166959,
                    mem: {
                      total_in_bytes: 15599742976,
                      adjusted_total_in_bytes: 15599742976,
                      free_in_bytes: 376324096,
                      used_in_bytes: 15223418880,
                      free_percent: 2,
                      used_percent: 98,
                    },
                  },
                },
              },
            },
          });
        }),
      },
    },
  } as unknown as jest.Mocked<IScopedClusterClient>;
  const mlClient = {
    getTrainedModelsStats: jest.fn(() => {
      return Promise.resolve({
        body: {
          trained_model_stats: mockResponse,
        },
      });
    }),
  } as unknown as jest.Mocked<MlClient>;
  const memoryOverviewService = {
    getDFAMemoryOverview: jest.fn(() => {
      return Promise.resolve([{ job_id: '', node_id: '', model_size: 32165465 }]);
    }),
    getAnomalyDetectionMemoryOverview: jest.fn(() => {
      return Promise.resolve([{ job_id: '', node_id: '', model_size: 32165465 }]);
    }),
  } as unknown as jest.Mocked<MemoryOverviewService>;

  let service: ModelService;

  beforeEach(() => {
    service = modelsProvider(client, mlClient, memoryOverviewService);
  });

  afterEach(() => {});

  it('extract nodes list correctly', async () => {
    expect(await service.getNodesOverview()).toEqual({
      count: 3,
      nodes: [
        {
          name: 'node3',
          allocated_models: [
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              model_size_bytes: 267386880,
              required_native_memory_bytes: 534773760,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              model_size_bytes: 260947500,
              required_native_memory_bytes: 521895000,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              model_size_bytes: 133378867,
              required_native_memory_bytes: 266757734,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'typeform__mobilebert-uncased-mnli',
              model_size_bytes: 100139008,
              required_native_memory_bytes: 200278016,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
          ],
          attributes: {
            'ml.machine_memory': '15599742976',
            'ml.max_jvm_size': '1073741824',
            'xpack.installed': 'true',
          },
          id: '3qIoLFnbSi-DwVrYioUCdw',
          memory_overview: {
            anomaly_detection: {
              total: 0,
            },
            dfa_training: {
              total: 0,
            },
            machine_memory: {
              jvm: 1073741824,
              total: 15599742976,
            },
            trained_models: {
              by_model: [
                {
                  model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
                  model_size: 534773760,
                },
                {
                  model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
                  model_size: 521895000,
                },
                {
                  model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
                  model_size: 266757734,
                },
                {
                  model_id: 'typeform__mobilebert-uncased-mnli',
                  model_size: 200278016,
                },
              ],
              total: 1555161790,
            },
          },
          roles: ['data', 'ingest', 'master', 'ml', 'transform'],
        },
        {
          name: 'node2',
          allocated_models: [
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              model_size_bytes: 267386880,
              required_native_memory_bytes: 534773760,
              model_threads: 1,
              state: 'started',
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              model_size_bytes: 260947500,
              required_native_memory_bytes: 521895000,
              model_threads: 1,
              state: 'started',
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              model_size_bytes: 133378867,
              required_native_memory_bytes: 266757734,
              model_threads: 1,
              state: 'started',
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'typeform__mobilebert-uncased-mnli',
              model_size_bytes: 100139008,
              required_native_memory_bytes: 200278016,
              model_threads: 1,
              state: 'started',
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
            },
          ],
          attributes: {
            'ml.machine_memory': '15599742976',
            'ml.max_jvm_size': '1073741824',
            'xpack.installed': 'true',
          },
          id: 'DpCy7SOBQla3pu0Dq-tnYw',
          memory_overview: {
            anomaly_detection: {
              total: 0,
            },
            dfa_training: {
              total: 0,
            },
            machine_memory: {
              jvm: 1073741824,
              total: 15599742976,
            },
            trained_models: {
              by_model: [
                {
                  model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
                  model_size: 534773760,
                },
                {
                  model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
                  model_size: 521895000,
                },
                {
                  model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
                  model_size: 266757734,
                },
                {
                  model_id: 'typeform__mobilebert-uncased-mnli',
                  model_size: 200278016,
                },
              ],
              total: 1555161790,
            },
          },
          roles: ['data', 'master', 'ml', 'transform'],
        },
        {
          allocated_models: [
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              model_size_bytes: 267386880,
              required_native_memory_bytes: 534773760,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              model_size_bytes: 260947500,
              required_native_memory_bytes: 521895000,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              model_size_bytes: 133378867,
              required_native_memory_bytes: 266757734,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              inference_threads: 1,
              model_id: 'typeform__mobilebert-uncased-mnli',
              model_size_bytes: 100139008,
              required_native_memory_bytes: 200278016,
              model_threads: 1,
              state: 'started',
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
            },
          ],
          attributes: {
            'ml.machine_memory': '15599742976',
            'ml.max_jvm_size': '1073741824',
            'xpack.installed': 'true',
          },
          id: 'pt7s6lKHQJaP4QHKtU-Q0Q',
          memory_overview: {
            anomaly_detection: {
              total: 0,
            },
            dfa_training: {
              total: 0,
            },
            machine_memory: {
              jvm: 1073741824,
              total: 15599742976,
            },
            trained_models: {
              by_model: [
                {
                  model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
                  model_size: 534773760,
                },
                {
                  model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
                  model_size: 521895000,
                },
                {
                  model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
                  model_size: 266757734,
                },
                {
                  model_id: 'typeform__mobilebert-uncased-mnli',
                  model_size: 200278016,
                },
              ],
              total: 1555161790,
            },
          },
          name: 'node1',
          roles: ['data', 'master', 'ml'],
        },
      ],
    });
  });
});
