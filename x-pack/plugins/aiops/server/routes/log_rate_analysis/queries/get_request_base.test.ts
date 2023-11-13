/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequestBase } from './get_request_base';

describe('getRequestBase', () => {
  it('defaults to not setting `ignore_throttled`', () => {
    const requestBase = getRequestBase({
      index: 'the-index',
      timeFieldName: 'the-time-field-name',
      searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
      start: 1577836800000,
      end: 1609459200000,
      baselineMin: 10,
      baselineMax: 20,
      deviationMin: 30,
      deviationMax: 40,
    });
    expect(requestBase.ignore_throttled).toEqual(undefined);
  });

  it('adds `ignore_throttled=false` when `includeFrozen=true`', () => {
    const requestBase = getRequestBase({
      index: 'the-index',
      timeFieldName: 'the-time-field-name',
      includeFrozen: true,
      searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
      start: 1577836800000,
      end: 1609459200000,
      baselineMin: 10,
      baselineMax: 20,
      deviationMin: 30,
      deviationMax: 40,
    });
    expect(requestBase.ignore_throttled).toEqual(false);
  });
});
