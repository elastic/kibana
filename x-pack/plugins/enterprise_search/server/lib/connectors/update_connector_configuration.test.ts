/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { ConnectorStatus } from '../../../common/types/connectors';

import { fetchConnectorById } from './fetch_connectors';
import { updateConnectorConfiguration } from './update_connector_configuration';

jest.mock('./fetch_connectors', () => ({ fetchConnectorById: jest.fn() }));

describe('updateConnectorConfiguration lib function', () => {
  const mockClient = {
    asCurrentUser: {
      update: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchConnectorById as jest.Mock).mockResolvedValue({
      primaryTerm: 0,
      seqNo: 3,
      value: {
        configuration: { test: { label: 'haha', value: 'this' } },
        id: 'connectorId',
        status: ConnectorStatus.NEEDS_CONFIGURATION,
      },
    });
  });

  it('should update configuration', async () => {
    await expect(
      updateConnectorConfiguration(mockClient as unknown as IScopedClusterClient, 'connectorId', {
        test: 'newValue',
      })
    ).resolves.toEqual({ test: { label: 'haha', value: 'newValue' } });
    expect(mockClient.asCurrentUser.update).toHaveBeenCalledWith({
      doc: {
        configuration: { test: { label: 'haha', value: 'newValue' } },
        status: ConnectorStatus.CONFIGURED,
      },
      id: 'connectorId',
      if_primary_term: 0,
      if_seq_no: 3,
      index: CONNECTORS_INDEX,
    });
  });

  it('should reject if connector does not exist', async () => {
    (fetchConnectorById as jest.Mock).mockImplementation(() => undefined);

    await expect(
      updateConnectorConfiguration(mockClient as unknown as IScopedClusterClient, 'connectorId', {
        test: 'newValue',
      })
    ).rejects.toEqual(new Error('Could not find connector'));
    expect(mockClient.asCurrentUser.update).not.toHaveBeenCalled();
  });
});
