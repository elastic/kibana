/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { EnterpriseSearchEngineDetails } from '../../../common/types/engines';

import { fetchEngineFieldCapabilities } from './field_capabilities';

describe('engines field_capabilities', () => {
  const mockClient = {
    asCurrentUser: {
      fieldCaps: jest.fn(),
    },
    asInternalUser: {},
  };
  const mockEngine: EnterpriseSearchEngineDetails = {
    created: '1999-12-31T23:59:59.999Z',
    indices: [],
    name: 'unit-test-engine',
    updated: '1999-12-31T23:59:59.999Z',
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets engine alias field capabilities', async () => {
    const fieldCapsResponse = {} as FieldCapsResponse;

    mockClient.asCurrentUser.fieldCaps.mockResolvedValueOnce(fieldCapsResponse);
    await expect(
      fetchEngineFieldCapabilities(mockClient as unknown as IScopedClusterClient, mockEngine)
    ).resolves.toEqual({
      created: mockEngine.created,
      field_capabilities: fieldCapsResponse,
      name: mockEngine.name,
      updated: mockEngine.updated,
    });

    expect(mockClient.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(1);
    expect(mockClient.asCurrentUser.fieldCaps).toHaveBeenCalledWith({
      fields: '*',
      include_unmapped: true,
      index: 'search-engine-unit-test-engine',
    });
  });
});
