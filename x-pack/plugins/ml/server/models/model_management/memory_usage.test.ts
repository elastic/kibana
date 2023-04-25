/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MemoryUsageService } from './memory_usage';
import type { MlClient } from '../../lib/ml_client';
import mockResponse from './__mocks__/mock_deployment_response.json';
import type { MemoryStatsResponse } from '../../../common/types/trained_models';

describe('Model service', () => {
  const mlClient = {
    getTrainedModelsStats: jest.fn(() => {
      return Promise.resolve({
        trained_model_stats: mockResponse,
      });
    }),
    getMemoryStats: jest.fn(() => {
      return Promise.resolve({
        _nodes: {
          total: 4,
          successful: 4,
          failed: 0,
        },
        cluster_name: 'test_cluster',
        nodes: {
          '3qIoLFnbSi-DwVr2333UCdw': {
            name: 'node3',
            transport_address: '10.10.10.2:9353',
            // missing the ml role
            roles: ['data', 'ingest', 'master', 'transform'],
            attributes: {},
            jvm: {
              heap_max_in_bytes: 1073741824,
              java_inference_in_bytes: 0,
              java_inference_max_in_bytes: 0,
            },
            mem: {
              adjusted_total_in_bytes: 15599742976,
              total_in_bytes: 15599742976,
              ml: {
                data_frame_analytics_in_bytes: 0,
                native_code_overhead_in_bytes: 0,
                max_in_bytes: 1073741824,
                anomaly_detectors_in_bytes: 0,
                native_inference_in_bytes: 1555161790,
              },
            },
            ephemeral_id: '3qIoLFnbSi-DwVrYioUCdw',
          },
          '3qIoLFnbSi-DwVrYioUCdw': {
            name: 'node3',
            transport_address: '10.10.10.2:9353',
            roles: ['data', 'ingest', 'master', 'ml', 'transform'],
            attributes: {
              'ml.machine_memory': '15599742976',
              'ml.max_jvm_size': '1073741824',
            },
            jvm: {
              heap_max_in_bytes: 1073741824,
              java_inference_in_bytes: 0,
              java_inference_max_in_bytes: 0,
            },
            mem: {
              adjusted_total_in_bytes: 15599742976,
              total_in_bytes: 15599742976,
              ml: {
                data_frame_analytics_in_bytes: 0,
                native_code_overhead_in_bytes: 0,
                max_in_bytes: 1073741824,
                anomaly_detectors_in_bytes: 0,
                native_inference_in_bytes: 1555161790,
              },
            },
            ephemeral_id: '3qIoLFnbSi-DwVrYioUCdw',
          },
          'DpCy7SOBQla3pu0Dq-tnYw': {
            name: 'node2',
            transport_address: '10.10.10.2:9352',
            roles: ['data', 'master', 'ml', 'transform'],
            attributes: {
              'ml.machine_memory': '15599742976',
              'ml.max_jvm_size': '1073741824',
            },
            jvm: {
              heap_max_in_bytes: 1073741824,
              java_inference_in_bytes: 0,
              java_inference_max_in_bytes: 0,
            },
            mem: {
              adjusted_total_in_bytes: 15599742976,
              total_in_bytes: 15599742976,
              ml: {
                data_frame_analytics_in_bytes: 0,
                native_code_overhead_in_bytes: 0,
                max_in_bytes: 1073741824,
                anomaly_detectors_in_bytes: 0,
                native_inference_in_bytes: 1555161790,
              },
            },
            ephemeral_id: '3qIoLFnbSi-DwVrYioUCdw',
          },
          'pt7s6lKHQJaP4QHKtU-Q0Q': {
            name: 'node1',
            transport_address: '10.10.10.2:9351',
            roles: ['data', 'master', 'ml'],
            attributes: {
              'ml.machine_memory': '15599742976',
              'ml.max_jvm_size': '1073741824',
            },
            jvm: {
              heap_max_in_bytes: 1073741824,
              java_inference_in_bytes: 0,
              java_inference_max_in_bytes: 0,
            },
            mem: {
              adjusted_total_in_bytes: 15599742976,
              total_in_bytes: 15599742976,
              ml: {
                data_frame_analytics_in_bytes: 0,
                native_code_overhead_in_bytes: 0,
                max_in_bytes: 1073741824,
                anomaly_detectors_in_bytes: 0,
                native_inference_in_bytes: 1555161790,
              },
            },
            ephemeral_id: '3qIoLFnbSi-DwVrYioUCdw',
          },
        },
      } as MemoryStatsResponse);
    }),
  } as unknown as jest.Mocked<MlClient>;

  let service: MemoryUsageService;

  beforeEach(() => {
    service = new MemoryUsageService(mlClient);
  });

  afterEach(() => {});

  it('extract nodes list correctly', async () => {
    expect(await service.getNodesOverview()).toEqual({
      _nodes: {
        failed: 0,
        successful: 3,
        total: 3,
      },
      nodes: [
        {
          allocated_models: [
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              inference_threads: 1,
              key: 'distilbert-base-uncased-finetuned-sst-2-english_node3',
              model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              model_size_bytes: 267386880,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 534773760,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              inference_threads: 1,
              key: 'elastic__distilbert-base-cased-finetuned-conll03-english_node3',
              model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              model_size_bytes: 260947500,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 521895000,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              inference_threads: 1,
              key: 'sentence-transformers__msmarco-minilm-l-12-v3_node3',
              model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              model_size_bytes: 133378867,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 266757734,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'typeform__mobilebert-uncased-mnli',
              inference_threads: 1,
              key: 'typeform__mobilebert-uncased-mnli_node3',
              model_id: 'typeform__mobilebert-uncased-mnli',
              model_size_bytes: 100139008,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 200278016,
              state: 'started',
            },
          ],
          attributes: {
            'ml.machine_memory': '15599742976',
            'ml.max_jvm_size': '1073741824',
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
            ml_max_in_bytes: 1073741824,
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
          name: 'node3',
          roles: ['data', 'ingest', 'master', 'ml', 'transform'],
        },
        {
          allocated_models: [
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              inference_threads: 1,
              key: 'distilbert-base-uncased-finetuned-sst-2-english_node2',
              model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              model_size_bytes: 267386880,
              model_threads: 1,
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
              required_native_memory_bytes: 534773760,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              inference_threads: 1,
              key: 'elastic__distilbert-base-cased-finetuned-conll03-english_node2',
              model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              model_size_bytes: 260947500,
              model_threads: 1,
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
              required_native_memory_bytes: 521895000,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              inference_threads: 1,
              key: 'sentence-transformers__msmarco-minilm-l-12-v3_node2',
              model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              model_size_bytes: 133378867,
              model_threads: 1,
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
              required_native_memory_bytes: 266757734,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'typeform__mobilebert-uncased-mnli',
              inference_threads: 1,
              key: 'typeform__mobilebert-uncased-mnli_node2',
              model_id: 'typeform__mobilebert-uncased-mnli',
              model_size_bytes: 100139008,
              model_threads: 1,
              node: {
                routing_state: {
                  reason: 'The object cannot be set twice!',
                  routing_state: 'failed',
                },
              },
              required_native_memory_bytes: 200278016,
              state: 'started',
            },
          ],
          attributes: {
            'ml.machine_memory': '15599742976',
            'ml.max_jvm_size': '1073741824',
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
            ml_max_in_bytes: 1073741824,
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
          name: 'node2',
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
              deployment_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              inference_threads: 1,
              key: 'distilbert-base-uncased-finetuned-sst-2-english_node1',
              model_id: 'distilbert-base-uncased-finetuned-sst-2-english',
              model_size_bytes: 267386880,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 534773760,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              inference_threads: 1,
              key: 'elastic__distilbert-base-cased-finetuned-conll03-english_node1',
              model_id: 'elastic__distilbert-base-cased-finetuned-conll03-english',
              model_size_bytes: 260947500,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 521895000,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              inference_threads: 1,
              key: 'sentence-transformers__msmarco-minilm-l-12-v3_node1',
              model_id: 'sentence-transformers__msmarco-minilm-l-12-v3',
              model_size_bytes: 133378867,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 266757734,
              state: 'started',
            },
            {
              allocation_status: {
                allocation_count: 2,
                state: 'started',
                target_allocation_count: 3,
              },
              deployment_id: 'typeform__mobilebert-uncased-mnli',
              inference_threads: 1,
              key: 'typeform__mobilebert-uncased-mnli_node1',
              model_id: 'typeform__mobilebert-uncased-mnli',
              model_size_bytes: 100139008,
              model_threads: 1,
              node: {
                average_inference_time_ms: 0,
                inference_count: 0,
                routing_state: {
                  routing_state: 'started',
                },
              },
              required_native_memory_bytes: 200278016,
              state: 'started',
            },
          ],
          attributes: {
            'ml.machine_memory': '15599742976',
            'ml.max_jvm_size': '1073741824',
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
            ml_max_in_bytes: 1073741824,
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
