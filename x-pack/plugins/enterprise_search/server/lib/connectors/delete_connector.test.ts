/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import { deleteConnectorById } from './delete_connector';

jest.mock('./post_cancel_syncs', () => ({
  cancelSyncs: jest.fn(),
}));
import { cancelSyncs } from './post_cancel_syncs';

describe('deleteConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      delete: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('should delete connector and cancel syncs', async () => {
    mockClient.asCurrentUser.delete.mockImplementation(() => true);

    await deleteConnectorById(mockClient as unknown as IScopedClusterClient, 'connectorId');
    expect(cancelSyncs as jest.Mock).toHaveBeenCalledWith(mockClient, 'connectorId');
    expect(mockClient.asCurrentUser.delete).toHaveBeenCalledWith({
      id: 'connectorId',
      index: CONNECTORS_INDEX,
      refresh: 'wait_for',
    });
    jest.useRealTimers();
  });
});
