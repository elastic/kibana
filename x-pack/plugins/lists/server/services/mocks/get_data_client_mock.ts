/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';

import { LIST_INDEX } from './lists_services_mock_constants';
import { getShardMock } from './get_shard_mock';

interface DataClientReturn {
  callAsCurrentUser: () => Promise<unknown>;
  callAsInternalUser: () => Promise<never>;
}

export const getEmptyCreateDocumentResponseMock = (): CreateDocumentResponse => ({
  _id: 'elastic-id-123',
  _index: LIST_INDEX,
  _shards: getShardMock(),
  _type: '',
  _version: 1,
  created: true,
  result: '',
});

export const getDataClientMock = (
  callAsCurrentUserData: unknown = getEmptyCreateDocumentResponseMock()
): DataClientReturn => ({
  callAsCurrentUser: jest.fn().mockResolvedValue(callAsCurrentUserData),
  callAsInternalUser: (): Promise<never> => {
    throw new Error('This function should not be calling "callAsInternalUser"');
  },
});
