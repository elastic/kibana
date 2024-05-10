/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBasicAuthHeader } from './get_basic_auth_header';

describe('getBasicAuthHeader', () => {
  it('constructs the basic auth header correctly', () => {
    expect(getBasicAuthHeader({ username: 'test', password: 'foo' })).toEqual({
      Authorization: `Basic ${Buffer.from('test:foo').toString('base64')}`,
    });
  });
});
