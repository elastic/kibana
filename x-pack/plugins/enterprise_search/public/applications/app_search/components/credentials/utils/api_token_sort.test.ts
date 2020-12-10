/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiTokenSort } from '.';
import { ApiTokenTypes } from '../constants';

import { ApiToken } from '../types';

describe('apiTokenSort', () => {
  const apiToken: ApiToken = {
    name: '',
    type: ApiTokenTypes.Private,
    read: true,
    write: true,
    access_all_engines: true,
    key: 'abc-1234',
  };

  it('sorts items by id', () => {
    const apiTokens = [
      {
        ...apiToken,
        id: 2,
      },
      {
        ...apiToken,
        id: undefined,
      },
      {
        ...apiToken,
        id: 1,
      },
    ];

    expect(apiTokens.sort(apiTokenSort).map((t) => t.id)).toEqual([undefined, 1, 2]);
  });
});
