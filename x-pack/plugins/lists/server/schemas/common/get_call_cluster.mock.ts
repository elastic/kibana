/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import { LIST_INDEX } from '../../../common/constants.mock';

import { getShardMock } from './get_shard.mock';

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
  response: unknown = getEmptyCreateDocumentResponseMock()
): LegacyAPICaller => jest.fn().mockResolvedValue(response);

export const getCallClusterMockMultiTimes = (
  responses: unknown[] = [getEmptyCreateDocumentResponseMock()]
): LegacyAPICaller => {
  const returnJest = jest.fn();
  responses.forEach((response) => {
    returnJest.mockResolvedValueOnce(response);
  });
  return returnJest;
};
