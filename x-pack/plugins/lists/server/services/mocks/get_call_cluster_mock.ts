/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';
import { APICaller } from 'kibana/server';

import { LIST_INDEX } from './lists_services_mock_constants';
import { getShardMock } from './get_shard_mock';

export const getEmptyCreateDocumentResponseMock = (): CreateDocumentResponse => ({
  _id: 'elastic-id-123',
  _index: LIST_INDEX,
  _shards: getShardMock(),
  _type: '',
  _version: 1,
  created: true,
  result: '',
});

export const getCallClusterMock = (
  callCluster: unknown = getEmptyCreateDocumentResponseMock()
): APICaller => jest.fn().mockResolvedValue(callCluster);
