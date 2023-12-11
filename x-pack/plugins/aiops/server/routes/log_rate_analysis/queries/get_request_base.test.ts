/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';

import { getRequestBase } from './get_request_base';

describe('getRequestBase', () => {
  it('defaults to not setting `ignore_throttled`', () => {
    const requestBase = getRequestBase(paramsMock);
    expect(requestBase.ignore_throttled).toEqual(undefined);
  });

  it('adds `ignore_throttled=false` when `includeFrozen=true`', () => {
    const requestBase = getRequestBase({
      ...paramsMock,
      includeFrozen: true,
    });
    expect(requestBase.ignore_throttled).toEqual(false);
  });
});
