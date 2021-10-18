/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getRequestBase } from './get_request_base';

describe('correlations', () => {
  describe('getRequestBase', () => {
    it('returns the request base parameters', () => {
      const requestBase = getRequestBase({
        index: 'apm-*',
        includeFrozen: true,
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 1577836800000,
        end: 1609459200000,
      });
      expect(requestBase).toEqual({
        index: 'apm-*',
        ignore_throttled: false,
        ignore_unavailable: true,
      });
    });

    it('defaults ignore_throttled to true', () => {
      const requestBase = getRequestBase({
        index: 'apm-*',
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 1577836800000,
        end: 1609459200000,
      });
      expect(requestBase).toEqual({
        index: 'apm-*',
        ignore_throttled: true,
        ignore_unavailable: true,
      });
    });
  });
});
