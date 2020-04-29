/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTickFormat } from '../get_tick_format';

describe('getTickFormat', () => {
  it('returns null if value is NaN', () => {
    expect(getTickFormat(null)).toEqual('N/A');
  });

  it('returns a number for a valid value', () => {
    expect(getTickFormat(23)).toEqual('23');
  });
});
