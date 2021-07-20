/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFirstElement } from './data_retrieval';

describe('getFirstElement', () => {
  it('returns undefined if array is undefined', () => {
    expect(getFirstElement(undefined)).toEqual(undefined);
  });

  it('returns undefined if array is empty', () => {
    expect(getFirstElement([])).toEqual(undefined);
  });

  it('returns the first element if present', () => {
    expect(getFirstElement(['hi mom'])).toEqual('hi mom');
  });

  it('returns the first element of multiple', () => {
    expect(getFirstElement(['hi mom', 'hello world'])).toEqual('hi mom');
  });
});
