/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getIndexState } from './get_index_state';
import { ResolveIndexResponseFromES } from './types';

describe('getIndexState', () => {
  const indexName1 = 'indexName';
  const indexName2 = 'indexName2';
  const response: ResolveIndexResponseFromES = {
    indices: [
      {
        name: indexName2,
        aliases: ['.security'],
        attributes: ['open'],
      },
      {
        name: indexName1,
        attributes: ['closed'],
      },
    ],
    aliases: [
      {
        name: '.security',
        indices: ['.security-7'],
      },
    ],
    data_streams: [],
  };

  it('correctly extracts state', () => {
    expect(getIndexState(indexName1, response)).toBe('closed');
    expect(getIndexState(indexName2, response)).toBe('open');
  });

  it('throws if the index name cannot be found', () => {
    expect(() => getIndexState('nonExistent', response)).toThrow('not found');
  });
});
