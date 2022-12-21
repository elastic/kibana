/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import { deleteConnectorById } from './delete_connector';

describe('deleteConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      delete: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete connector', async () => {
    mockClient.asCurrentUser.delete.mockImplementation(() => true);
    await expect(
      deleteConnectorById(mockClient as unknown as IScopedClusterClient, 'connectorId')
    ).resolves.toEqual(true);
    expect(mockClient.asCurrentUser.delete).toHaveBeenCalledWith({
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
  });
});
