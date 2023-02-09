/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX, CONNECTORS_VERSION } from '..';

import { defaultConnectorsPipelineMeta, setupConnectorsIndices } from './setup_indices';

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
      pipeline: defaultConnectorsPipelineMeta,
    },
    dynamic: false,
    properties: {
      api_key_id: {
        type: 'keyword',
      },
      configuration: {
        type: 'object',
      },
      custom_scheduling: {
        type: 'object',
      },
      description: { type: 'text' },
      error: { type: 'keyword' },
      features: {
        properties: {
          filtering_advanced_config: { type: 'boolean' },
          filtering_rules: { type: 'boolean' },
        },
      },
      filtering: {
        properties: {
          active: {
            properties: {
              advanced_snippet: {
                properties: {
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' },
                  value: { type: 'object' },
                },
              },
              rules: {
                properties: {
                  created_at: { type: 'date' },
                  field: { type: 'keyword' },
                  id: { type: 'keyword' },
                  order: { type: 'short' },
                  policy: { type: 'keyword' },
                  rule: { type: 'keyword' },
                  updated_at: { type: 'date' },
                  value: { type: 'keyword' },
                },
              },
              validation: {
                properties: {
                  errors: {
                    properties: {
                      ids: { type: 'keyword' },
                      messages: { type: 'text' },
                    },
                  },
                  state: { type: 'keyword' },
                },
              },
            },
          },
          domain: { type: 'keyword' },
          draft: {
            properties: {
              advanced_snippet: {
                properties: {
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' },
                  value: { type: 'object' },
                },
              },
              rules: {
                properties: {
                  created_at: { type: 'date' },
                  field: { type: 'keyword' },
                  id: { type: 'keyword' },
                  order: { type: 'short' },
                  policy: { type: 'keyword' },
                  rule: { type: 'keyword' },
                  updated_at: { type: 'date' },
                  value: { type: 'keyword' },
                },
              },
              validation: {
                properties: {
                  errors: {
                    properties: {
                      ids: { type: 'keyword' },
                      messages: { type: 'text' },
                    },
                  },
                  state: { type: 'keyword' },
                },
              },
            },
          },
        },
      },
      index_name: { type: 'keyword' },
      is_native: { type: 'boolean' },
      language: { type: 'keyword' },
      last_deleted_document_count: { type: 'long' },
      last_indexed_document_count: { type: 'long' },
      last_seen: { type: 'date' },
      last_sync_error: { type: 'keyword' },
      last_sync_status: { type: 'keyword' },
      last_synced: { type: 'date' },
      name: { type: 'keyword' },
      pipeline: {
        properties: {
          extract_binary_content: { type: 'boolean' },
          name: { type: 'keyword' },
          reduce_whitespace: { type: 'boolean' },
          run_ml_inference: { type: 'boolean' },
        },
      },
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
    dynamic: false,
    properties: {
      cancelation_requested_at: { type: 'date' },
      canceled_at: { type: 'date' },
      completed_at: { type: 'date' },
      connector: {
        properties: {
          configuration: { type: 'object' },
          filtering: {
            properties: {
              advanced_snippet: {
                properties: {
                  created_at: { type: 'date' },
                  updated_at: { type: 'date' },
                  value: { type: 'object' },
                },
              },
              domain: { type: 'keyword' },
              rules: {
                properties: {
                  created_at: { type: 'date' },
                  field: { type: 'keyword' },
                  id: { type: 'keyword' },
                  order: { type: 'short' },
                  policy: { type: 'keyword' },
                  rule: { type: 'keyword' },
                  updated_at: { type: 'date' },
                  value: { type: 'keyword' },
                },
              },
              warnings: {
                properties: {
                  ids: { type: 'keyword' },
                  messages: { type: 'text' },
                },
              },
            },
          },
          id: { type: 'keyword' },
          index_name: { type: 'keyword' },
          language: { type: 'keyword' },
          pipeline: {
            properties: {
              extract_binary_content: { type: 'boolean' },
              name: { type: 'keyword' },
              reduce_whitespace: { type: 'boolean' },
              run_ml_inference: { type: 'boolean' },
            },
          },
          service_type: { type: 'keyword' },
        },
      },
      created_at: { type: 'date' },
      deleted_document_count: { type: 'integer' },
      error: { type: 'keyword' },
      indexed_document_count: { type: 'integer' },
      indexed_document_volume: { type: 'integer' },
      last_seen: { type: 'date' },
      metadata: { type: 'object' },
      started_at: { type: 'date' },
      status: {
        type: 'keyword',
      },
      total_document_count: { type: 'integer' },
      trigger_method: { type: 'keyword' },
      worker_hostname: { type: 'keyword' },
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
        settings: { auto_expand_replicas: '0-3', hidden: true, number_of_replicas: 0 },
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
        settings: { auto_expand_replicas: '0-3', hidden: true, number_of_replicas: 0 },
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
