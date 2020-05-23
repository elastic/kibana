/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformer } from './transformer';
import { response } from './__fixtures__/responses';

describe('transformer', () => {
  it('transforms', () => {
    expect(transformer({ response })).toEqual([
      {
        data: [
          { x: 1571650700000, y: undefined },
          { x: 1571650800000, y: 86425.1 },
        ],
        title: 'Firefox',
      },
      {
        data: [
          { x: 1571650700000, y: undefined },
          { x: 1571650800000, y: 860425.0 },
        ],
        title: 'Other',
      },
    ]);
  });
});
