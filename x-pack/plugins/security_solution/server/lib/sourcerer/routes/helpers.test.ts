/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { findExistingIndices } from './helpers';
import type { ElasticsearchClient } from '@kbn/core/server';

const fieldCaps = jest
  .fn()
  .mockImplementation(() => new Promise((resolve) => resolve([true, true])));
const esClient = {
  fieldCaps,
};

describe('sourcerer helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('findExistingIndices calls with regular indices', async () => {
    await findExistingIndices(['a', 'b'], esClient as unknown as ElasticsearchClient);
    expect(esClient.fieldCaps.mock.calls[0][0].index).toEqual('a');
    expect(esClient.fieldCaps.mock.calls[1][0].index).toEqual('b');
  });
  it('findExistingIndices calls with regular indices in place of exclude indices', async () => {
    await findExistingIndices(['a', '-b'], esClient as unknown as ElasticsearchClient);
    expect(esClient.fieldCaps.mock.calls[0][0].index).toEqual('a');
    expect(esClient.fieldCaps.mock.calls[1][0].index).toEqual('b');
  });
  it('findExistingIndices removes leading / trailing whitespace, and dashes from exclude patterns', async () => {
    await findExistingIndices(
      [
        '   include-with-leading-and-trailing-whitespace    ',
        '   -exclude-with-leading-and-trailing-whitespace   ',
      ],
      esClient as unknown as ElasticsearchClient
    );
    expect(esClient.fieldCaps.mock.calls[0][0].index).toEqual(
      'include-with-leading-and-trailing-whitespace'
    );
    expect(esClient.fieldCaps.mock.calls[1][0].index).toEqual(
      'exclude-with-leading-and-trailing-whitespace'
    );
  });
});
