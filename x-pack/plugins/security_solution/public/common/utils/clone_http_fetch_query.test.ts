/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneHttpFetchQuery } from './clone_http_fetch_query';
import { HttpFetchQuery } from '../../../../../../src/core/public';
import { Immutable } from '../../../common/endpoint/types';

describe('cloneHttpFetchQuery', () => {
  it('can clone complex queries', () => {
    const query: Immutable<HttpFetchQuery> = {
      a: 'a',
      '1': 1,
      undefined,
      array: [1, 2, undefined],
    };
    expect(cloneHttpFetchQuery(query)).toMatchInlineSnapshot(`
      Object {
        "1": 1,
        "a": "a",
        "array": Array [
          1,
          2,
          undefined,
        ],
        "undefined": undefined,
      }
    `);
  });
});
