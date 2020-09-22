/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getCommaSeparetedAggregationKey } from './utils';

describe('alerts utils', () => {
  describe('getCommaSeparetedAggregationKey', () => {
    it('returns comma separeted', () => {
      const buckets = [{ key: 'foo' }, { key: 'bar' }];
      expect(getCommaSeparetedAggregationKey(buckets)).toEqual('foo,bar');
    });
  });
});
