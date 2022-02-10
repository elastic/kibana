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
    it('defaults to not setting `ignore_throttled`', () => {
      const requestBase = getRequestBase({
        index: 'apm-*',
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 1577836800000,
        end: 1609459200000,
      });
      expect(requestBase.ignore_throttled).toEqual(undefined);
    });

    it('adds `ignore_throttled=false` when `includeFrozen=true`', () => {
      const requestBase = getRequestBase({
        index: 'apm-*',
        includeFrozen: true,
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        start: 1577836800000,
        end: 1609459200000,
      });
      expect(requestBase.ignore_throttled).toEqual(false);
    });
  });
});
