/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cache } from './cache';

describe('cache', () => {
  it('does not call the function if not invoked', () => {
    const fn = jest.fn();
    cache(fn);

    expect(fn).not.toHaveBeenCalled();
  });

  it('returns the function result', () => {
    const fn = jest.fn().mockReturnValue('result');
    const cachedFn = cache(fn);

    expect(cachedFn()).toEqual('result');
  });

  it('only calls the function once for multiple invocations', () => {
    const fn = jest.fn();
    const cachedFn = cache(fn);

    cachedFn();
    cachedFn();
    cachedFn();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns the function result on subsequent invocations', () => {
    const fn = jest.fn().mockReturnValue('result');
    const cachedFn = cache(fn);

    expect([cachedFn(), cachedFn(), cachedFn()]).toEqual(['result', 'result', 'result']);
  });
});
