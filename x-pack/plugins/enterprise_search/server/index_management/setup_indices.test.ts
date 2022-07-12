/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX, CONNECTORS_VERSION } from '..';

import { setupConnectorsIndices } from './setup_indices';

describe('Setup Indices', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        create: jest.fn(),
        get: jest.fn(),
        stats: jest.fn(),
        updateAliases: jest.fn(),
      },
      search: jest.fn(),
    },
    asInternalUser: {},
  };

  const connectorsIndexName = `${CONNECTORS_INDEX}-v${CONNECTORS_VERSION}`;
  const jobsIndexName = `${CONNECTORS_JOBS_INDEX}-v${CONNECTORS_VERSION}`;

  const connectorsMappings = {
    _meta: {
      version: CONNECTORS_VERSION,
    },
    properties: {
      api_key_id: {
        type: 'keyword',
      },
      configuration: {
        type: 'object',
      },
      error: { type: 'keyword' },
      index_name: { type: 'text' },
      language: { type: 'keyword' },
      last_seen: { type: 'date' },
      last_sync_error: { type: 'keyword' },
      last_sync_status: { type: 'keyword' },
      last_synced: { type: 'date' },
      scheduling: {
        properties: {
          enabled: { type: 'boolean' },
          interval: { type: 'text' },
        },
      },
      service_type: { type: 'keyword' },
      status: { type: 'keyword' },
      sync_now: { type: 'boolean' },
    },
  };

  const connectorsJobsMappings = {
    _meta: {
      version: CONNECTORS_VERSION,
    },
    properties: {
      api_key_id: {
        type: 'keyword',
      },
      configuration: {
        type: 'object',
      },
      error: { type: 'keyword' },
      index_name: { type: 'text' },
      language: { type: 'keyword' },
      last_seen: { type: 'date' },
      last_sync_error: { type: 'keyword' },
      last_sync_status: { type: 'keyword' },
      last_synced: { type: 'date' },
      scheduling: {
        properties: {
          enabled: { type: 'boolean' },
          interval: { type: 'text' },
        },
      },
      service_type: { type: 'keyword' },
      status: { type: 'keyword' },
      sync_now: { type: 'boolean' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('setupConnectorsIndices', () => {
    it('should do nothing if indices exist', async () => {
      const result = {
        [connectorsIndexName]: {
          mappings: {
            _meta: {
              version: CONNECTORS_VERSION,
            },
          },
        },
        [jobsIndexName]: {
          mappings: {
            _meta: {
              version: CONNECTORS_VERSION,
            },
          },
        },
      };
      mockClient.asCurrentUser.indices.get.mockImplementation(() => Promise.resolve(result));
      mockClient.asCurrentUser.indices.create.mockImplementation(() => Promise.resolve());
      mockClient.asCurrentUser.indices.updateAliases.mockImplementation(() => Promise.resolve());
      await expect(setupConnectorsIndices(mockClient.asCurrentUser as any)).resolves.toEqual(
        undefined
      );
      expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
      expect(mockClient.asCurrentUser.indices.updateAliases).not.toHaveBeenCalled();
    });
    it('should do nothing if it hits race condition exist', async () => {
      const result = {
        [connectorsIndexName]: {
          mappings: {
            _meta: {
              version: CONNECTORS_VERSION,
            },
          },
        },
        [jobsIndexName]: {
          mappings: {
            _meta: {
              version: CONNECTORS_VERSION,
            },
          },
        },
      };
      mockClient.asCurrentUser.indices.get.mockImplementation(() => Promise.resolve(result));
      mockClient.asCurrentUser.indices.create.mockImplementation(() =>
        Promise.reject({ meta: { body: { error: { type: 'resource_already_exists_exception' } } } })
      );
      mockClient.asCurrentUser.indices.updateAliases.mockImplementation(() => Promise.resolve());
      await expect(setupConnectorsIndices(mockClient.asCurrentUser as any)).resolves.toEqual(
        undefined
      );
      expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
      expect(mockClient.asCurrentUser.indices.updateAliases).not.toHaveBeenCalled();
    });
    it('should create new index and update alias if connectors index does not exist', async () => {
      const result = {
        [jobsIndexName]: {
          mappings: {
            _meta: {
              version: CONNECTORS_VERSION,
            },
          },
        },
      };
      mockClient.asCurrentUser.indices.get.mockImplementation(() => Promise.resolve(result));
      mockClient.asCurrentUser.indices.create.mockImplementation(() => Promise.resolve());
      mockClient.asCurrentUser.indices.updateAliases.mockImplementation(() => Promise.resolve());
      await expect(setupConnectorsIndices(mockClient.asCurrentUser as any)).resolves.toEqual(
        undefined
      );
      expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
        index: connectorsIndexName,
        mappings: connectorsMappings,
        settings: { hidden: true },
      });
      expect(mockClient.asCurrentUser.indices.updateAliases).toHaveBeenCalledWith({
        actions: [
          {
            add: {
              aliases: [CONNECTORS_INDEX],
              index: `${CONNECTORS_INDEX}-v${CONNECTORS_VERSION}`,
              is_hidden: true,
              is_write_index: true,
            },
          },
        ],
      });
    });
    it('should create new jobs index and update alias if jobs index does not exist', async () => {
      const result = {
        [connectorsIndexName]: {
          mappings: {
            _meta: {
              version: CONNECTORS_VERSION,
            },
          },
        },
      };
      mockClient.asCurrentUser.indices.get.mockImplementation(() => Promise.resolve(result));
      mockClient.asCurrentUser.indices.create.mockImplementation(() => Promise.resolve());
      mockClient.asCurrentUser.indices.updateAliases.mockImplementation(() => Promise.resolve());
      await expect(setupConnectorsIndices(mockClient.asCurrentUser as any)).resolves.toEqual(
        undefined
      );
      expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
        index: jobsIndexName,
        mappings: connectorsJobsMappings,
        settings: { hidden: true },
      });
      expect(mockClient.asCurrentUser.indices.updateAliases).toHaveBeenCalledWith({
        actions: [
          {
            add: {
              aliases: [CONNECTORS_JOBS_INDEX],
              index: `${CONNECTORS_JOBS_INDEX}-v${CONNECTORS_VERSION}`,
              is_hidden: true,
              is_write_index: true,
            },
          },
        ],
      });
    });
  });
});
