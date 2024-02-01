/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { EntityStoreDataClient } from './entity_store_data_client';

jest.mock('../utils/create_or_update_index', () => ({
  createOrUpdateIndex: jest.fn(),
}));

describe('EntityStoreDataClient', () => {
  let entityStoreDataClient: EntityStoreDataClient;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    const options = {
      logger,
      esClient,
      namespace: 'default',
    };
    entityStoreDataClient = new EntityStoreDataClient(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize entity store resources successfully', async () => {
    await entityStoreDataClient.init({
      taskManager: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    expect(createOrUpdateIndex).toHaveBeenCalledWith({
      logger,
      esClient,
      options: {
        index: '.entities.entities-default',
        mappings: {
          dynamic: 'strict',
          properties: {
            '@timestamp': {
              ignore_malformed: false,
              type: 'date',
            },
            agent: {
              properties: {
                id: {
                  type: 'keyword',
                },
                type: {
                  type: 'keyword',
                },
              },
            },
            cloud: {
              properties: {
                provider: {
                  type: 'keyword',
                },
                region: {
                  type: 'keyword',
                },
              },
            },
            entity_type: {
              type: 'keyword',
            },
            host: {
              properties: {
                architecture: {
                  type: 'keyword',
                },
                asset: {
                  properties: {
                    criticality: {
                      type: 'keyword',
                    },
                  },
                },
                id: {
                  type: 'keyword',
                },
                ip: {
                  type: 'ip',
                },
                name: {
                  type: 'keyword',
                },
                os: {
                  properties: {
                    platform: {
                      type: 'keyword',
                    },
                    version: {
                      type: 'keyword',
                    },
                  },
                },
                risk: {
                  properties: {
                    calculated_level: {
                      type: 'keyword',
                    },
                    calculated_score: {
                      type: 'float',
                    },
                    calculated_score_norm: {
                      type: 'float',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
