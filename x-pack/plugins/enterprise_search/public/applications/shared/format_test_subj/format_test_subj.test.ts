/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatTestSubj } from './';

describe('formatTestSubj', () => {
  it('should format string to correct casing', () => {
    expect(formatTestSubj('foo_bar BAZ')).toEqual('FooBarBaz');
  });
});
