/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseQueryParams } from './';

describe('parseQueryParams', () => {
  it('parse query strings', () => {
    expect(parseQueryParams('?foo=bar')).toEqual({ foo: 'bar' });
    expect(parseQueryParams('?foo[]=bar&foo[]=baz')).toEqual({ foo: ['bar', 'baz'] });
  });
});
