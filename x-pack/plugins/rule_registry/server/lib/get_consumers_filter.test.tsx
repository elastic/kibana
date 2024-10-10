/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConsumersFilter } from './get_consumers_filter';

describe('getConsumersFilter()', () => {
  it('should return a consumers filter', () => {
    expect(getConsumersFilter(['foo', 'bar'])).toStrictEqual({
      terms: {
        'kibana.alert.rule.consumer': ['foo', 'bar'],
      },
    });
  });

  it('should return undefined if no consumers are provided', () => {
    expect(getConsumersFilter()).toBeUndefined();
  });

  it('should return undefined if an empty array is provided', () => {
    expect(getConsumersFilter([])).toBeUndefined();
  });
});
