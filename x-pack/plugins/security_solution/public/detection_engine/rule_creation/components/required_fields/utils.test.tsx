/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickTypeForName } from './utils';

describe('pickTypeForName', () => {
  it('returns the current type if it is available for the current name', () => {
    const typesByFieldName = {
      name1: ['text', 'keyword'],
    };

    expect(
      pickTypeForName({
        name: 'name1',
        type: 'keyword',
        typesByFieldName,
      })
    ).toEqual('keyword');
  });

  it('returns the first available type if the current type is not available for the current name', () => {
    const typesByFieldName = {
      name1: ['text', 'keyword'],
    };

    expect(
      pickTypeForName({
        name: 'name1',
        type: 'long',
        typesByFieldName,
      })
    ).toEqual('text');
  });

  it('returns the current type if no types are available for the current name', () => {
    expect(
      pickTypeForName({
        name: 'name1',
        type: 'keyword',
        typesByFieldName: {},
      })
    ).toEqual('keyword');

    expect(
      pickTypeForName({
        name: 'name1',
        type: 'keyword',
        typesByFieldName: {
          name1: [],
        },
      })
    ).toEqual('keyword');
  });
});
