/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetResponse,
  SecurityHasPrivilegesResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { fetchIndicesStatus, fetchUserStartPrivileges } from './status';

const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
};
const logger: Logger = mockLogger as unknown as Logger;

const mockClient = {
  indices: {
    get: jest.fn(),
  },
  security: {
    hasPrivileges: jest.fn(),
  },
};
const client = mockClient as unknown as ElasticsearchClient;

describe('status api lib', function () {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchIndicesStatus', function () {
    it('should return results from get', async () => {
      const mockResult: IndicesGetResponse = {};
      mockClient.indices.get.mockResolvedValue(mockResult);

      await expect(fetchIndicesStatus(client, logger)).resolves.toEqual({ indexNames: [] });
      expect(mockClient.indices.get).toHaveBeenCalledTimes(1);
      expect(mockClient.indices.get).toHaveBeenCalledWith({
        expand_wildcards: ['open'],
        features: ['settings'],
        index: '*',
      });
    });
    it('should return index names', async () => {
      const mockResult: IndicesGetResponse = {
        'unit-test-index': {
          settings: {},
        },
      };
      mockClient.indices.get.mockResolvedValue(mockResult);

      await expect(fetchIndicesStatus(client, logger)).resolves.toEqual({
        indexNames: ['unit-test-index'],
      });
    });
    it('should not return hidden indices', async () => {
      const mockResult: IndicesGetResponse = {
        'unit-test-index': {
          settings: {},
        },
        'hidden-index': {
          settings: {
            index: {
              hidden: true,
            },
          },
        },
      };
      mockClient.indices.get.mockResolvedValue(mockResult);

      await expect(fetchIndicesStatus(client, logger)).resolves.toEqual({
        indexNames: ['unit-test-index'],
      });

      mockResult['hidden-index']!.settings!.index!.hidden = 'true';
      await expect(fetchIndicesStatus(client, logger)).resolves.toEqual({
        indexNames: ['unit-test-index'],
      });
    });
    it('should not return closed indices', async () => {
      const mockResult: IndicesGetResponse = {
        'unit-test-index': {
          settings: {},
        },
        'closed-index': {
          settings: {
            index: {
              verified_before_close: true,
            },
          },
        },
      };
      mockClient.indices.get.mockResolvedValue(mockResult);

      await expect(fetchIndicesStatus(client, logger)).resolves.toEqual({
        indexNames: ['unit-test-index'],
      });

      mockResult['closed-index']!.settings!.index!.verified_before_close = 'true';
      await expect(fetchIndicesStatus(client, logger)).resolves.toEqual({
        indexNames: ['unit-test-index'],
      });
    });
    it('should raise exceptions', async () => {
      const error = new Error('boom');
      mockClient.indices.get.mockRejectedValue(error);

      await expect(fetchIndicesStatus(client, logger)).rejects.toThrow(error);
    });
  });

  describe('fetchUserStartPrivileges', function () {
    const testIndexName = 'search-zbd1';
    it('should return privileges true', async () => {
      const result: SecurityHasPrivilegesResponse = {
        application: {},
        cluster: {
          manage_api_key: true,
        },
        has_all_requested: true,
        index: {
          [testIndexName]: {
            delete: true,
            manage: true,
          },
        },
        username: 'unit-test',
      };

      mockClient.security.hasPrivileges.mockResolvedValue(result);

      await expect(fetchUserStartPrivileges(client, logger, testIndexName)).resolves.toEqual({
        privileges: {
          canManageIndex: true,
          canDeleteDocuments: true,
          canCreateApiKeys: true,
        },
      });

      expect(mockClient.security.hasPrivileges).toHaveBeenCalledTimes(1);
      expect(mockClient.security.hasPrivileges).toHaveBeenCalledWith({
        cluster: ['manage_api_key'],
        index: [
          {
            names: [testIndexName],
            privileges: ['manage', 'delete'],
          },
        ],
      });
    });
    it('should return privileges false', async () => {
      const result: SecurityHasPrivilegesResponse = {
        application: {},
        cluster: {
          manage_api_key: false,
        },
        has_all_requested: false,
        index: {
          [testIndexName]: {
            manage: false,
            delete: false,
          },
        },
        username: 'unit-test',
      };
      mockClient.security.hasPrivileges.mockResolvedValue(result);

      await expect(fetchUserStartPrivileges(client, logger, testIndexName)).resolves.toEqual({
        privileges: {
          canManageIndex: false,
          canDeleteDocuments: false,
          canCreateApiKeys: false,
        },
      });
    });
    it('should return mixed privileges', async () => {
      const result: SecurityHasPrivilegesResponse = {
        application: {},
        cluster: {
          manage_api_key: false,
        },
        has_all_requested: false,
        index: {
          [testIndexName]: {
            manage: true,
            delete: true,
          },
        },
        username: 'unit-test',
      };
      mockClient.security.hasPrivileges.mockResolvedValue(result);

      await expect(fetchUserStartPrivileges(client, logger, testIndexName)).resolves.toEqual({
        privileges: {
          canManageIndex: true,
          canDeleteDocuments: true,
          canCreateApiKeys: false,
        },
      });
    });
    it('should handle malformed responses', async () => {
      const result: SecurityHasPrivilegesResponse = {
        application: {},
        cluster: {},
        has_all_requested: true,
        index: {
          [testIndexName]: {
            manage: true,
            delete: false,
          },
        },
        username: 'unit-test',
      };
      mockClient.security.hasPrivileges.mockResolvedValue(result);

      await expect(fetchUserStartPrivileges(client, logger, testIndexName)).resolves.toEqual({
        privileges: {
          canManageIndex: true,
          canDeleteDocuments: false,
          canCreateApiKeys: false,
        },
      });
    });
    it('should default privileges on exceptions', async () => {
      mockClient.security.hasPrivileges.mockRejectedValue(new Error('Boom!!'));

      await expect(fetchUserStartPrivileges(client, logger, testIndexName)).resolves.toEqual({
        privileges: {
          canManageIndex: false,
          canDeleteDocuments: false,
          canCreateApiKeys: false,
        },
      });
    });
  });
});
