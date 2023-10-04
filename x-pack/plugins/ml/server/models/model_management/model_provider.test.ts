/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelsProvider } from './models_provider';
import { type IScopedClusterClient } from '@kbn/core/server';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';

describe('modelsProvider', () => {
  const mockClient = {
    asInternalUser: {
      transport: {
        request: jest.fn().mockResolvedValue({
          _nodes: {
            total: 1,
            successful: 1,
            failed: 0,
          },
          cluster_name: 'default',
          nodes: {
            yYmqBqjpQG2rXsmMSPb9pQ: {
              name: 'node-0',
              roles: ['ml'],
              attributes: {},
              os: {
                name: 'Linux',
                arch: 'amd64',
              },
            },
          },
        }),
      },
    },
  } as unknown as jest.Mocked<IScopedClusterClient>;

  const mockCloud = cloudMock.createSetup();
  const modelService = modelsProvider(mockClient, mockCloud);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getModelDownloads', () => {
    test('provides a list of models with recommended and default flag', async () => {
      const result = await modelService.getModelDownloads();
      expect(result).toEqual([
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
          hidden: true,
          name: '.elser_model_1',
          version: 1,
        },
        {
          config: { input: { field_names: ['text_field'] } },
          default: true,
          description: 'Elastic Learned Sparse EncodeR v2 (Tech Preview)',
          name: '.elser_model_2',
          version: 2,
        },
        {
          arch: 'amd64',
          config: { input: { field_names: ['text_field'] } },
          description:
            'Elastic Learned Sparse EncodeR v2, optimized for linux-x86_64 (Tech Preview)',
          name: '.elser_model_2_linux-x86_64',
          os: 'Linux',
          recommended: true,
          version: 2,
        },
      ]);
    });

    test('provides a list of models with default model as recommended', async () => {
      mockCloud.cloudId = undefined;
      (mockClient.asInternalUser.transport.request as jest.Mock).mockResolvedValueOnce({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        cluster_name: 'default',
        nodes: {
          yYmqBqjpQG2rXsmMSPb9pQ: {
            name: 'node-0',
            roles: ['ml'],
            attributes: {},
            os: {
              name: 'Mac OS X',
              arch: 'aarch64',
            },
          },
        },
      });

      const result = await modelService.getModelDownloads();

      expect(result).toEqual([
        {
          config: { input: { field_names: ['text_field'] } },
          description: 'Elastic Learned Sparse EncodeR v1 (Tech Preview)',
          hidden: true,
          name: '.elser_model_1',
          version: 1,
        },
        {
          config: { input: { field_names: ['text_field'] } },
          recommended: true,
          description: 'Elastic Learned Sparse EncodeR v2 (Tech Preview)',
          name: '.elser_model_2',
          version: 2,
        },
        {
          arch: 'amd64',
          config: { input: { field_names: ['text_field'] } },
          description:
            'Elastic Learned Sparse EncodeR v2, optimized for linux-x86_64 (Tech Preview)',
          name: '.elser_model_2_linux-x86_64',
          os: 'Linux',
          version: 2,
        },
      ]);
    });
  });

  describe('getELSER', () => {
    test('provides a recommended definition by default', async () => {
      const result = await modelService.getELSER();
      expect(result.name).toEqual('.elser_model_2_linux-x86_64');
    });

    test('provides a default version if there is no recommended', async () => {
      mockCloud.cloudId = undefined;
      (mockClient.asInternalUser.transport.request as jest.Mock).mockResolvedValueOnce({
        _nodes: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        cluster_name: 'default',
        nodes: {
          yYmqBqjpQG2rXsmMSPb9pQ: {
            name: 'node-0',
            roles: ['ml'],
            attributes: {},
            os: {
              name: 'Mac OS X',
              arch: 'aarch64',
            },
          },
        },
      });

      const result = await modelService.getELSER();
      expect(result.name).toEqual('.elser_model_2');
    });

    test('provides the requested version', async () => {
      const result = await modelService.getELSER({ version: 1 });
      expect(result.name).toEqual('.elser_model_1');
    });

    test('provides the requested version of a recommended architecture', async () => {
      const result = await modelService.getELSER({ version: 2 });
      expect(result.name).toEqual('.elser_model_2_linux-x86_64');
    });
  });
});
