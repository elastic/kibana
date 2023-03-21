/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYTICS_VERSION } from '../..';

import { setupAnalyticsCollectionIndex } from './setup_indices';

describe('setup analytics collection index', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        create: jest.fn(),
        updateAliases: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create the analytics collection index when it doesn't exist", async () => {
    const indexName = '.elastic-analytics-collections';
    const analyticCollectionsMappings = {
      _meta: {
        version: ANALYTICS_VERSION,
      },
      properties: {
        event_retention_day_length: {
          type: 'long',
        },
        eventsDatastream: {
          type: 'keyword',
        },
        name: {
          type: 'keyword',
        },
      },
    };

    mockClient.asCurrentUser.indices.create.mockImplementation(() => Promise.resolve());
    mockClient.asCurrentUser.indices.updateAliases.mockImplementation(() => Promise.resolve());
    await expect(setupAnalyticsCollectionIndex(mockClient.asCurrentUser as any)).resolves.toEqual(
      undefined
    );
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: `${indexName}-v${1}`,
      mappings: analyticCollectionsMappings,
      settings: { auto_expand_replicas: '0-3', hidden: true, number_of_replicas: 0 },
    });
    expect(mockClient.asCurrentUser.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        {
          add: {
            aliases: [indexName],
            index: `${indexName}-v${1}`,
            is_hidden: true,
            is_write_index: true,
          },
        },
      ],
    });
  });

  it('should do nothing if it hits that resource already exists', async () => {
    mockClient.asCurrentUser.indices.create.mockImplementation(() =>
      Promise.reject({ meta: { body: { error: { type: 'resource_already_exists_exception' } } } })
    );
    await expect(setupAnalyticsCollectionIndex(mockClient.asCurrentUser as any)).resolves.toEqual(
      undefined
    );
    expect(mockClient.asCurrentUser.indices.updateAliases).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalled();
  });
});
