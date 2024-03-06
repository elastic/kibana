/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapInMacrotask } from './wrap_in_macrotask';

jest.useFakeTimers();

describe('wrapInMacrotask', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('wraps a sync function in a macro task', async () => {
    const fn = jest.fn().mockReturnValue('some value');
    const wrappedFn = wrapInMacrotask(fn);

    const result = wrappedFn();

    expect(result).toEqual(expect.any(Promise));
    expect(jest.getTimerCount()).toBe(1);
  });

  it('wraps an async function in a macro task', async () => {
    const fn = jest.fn().mockResolvedValue('async value');
    const wrappedFn = wrapInMacrotask(fn);

    const result = wrappedFn();

    expect(result).toEqual(expect.any(Promise));
    expect(jest.getTimerCount()).toBe(1);
  });

  it('returns a sync function the result', () => {
    const fn = jest.fn().mockReturnValue('some value');
    const wrappedFn = wrapInMacrotask(fn);

    const promise = wrappedFn();

    jest.runOnlyPendingTimers();

    return expect(promise).resolves.toBe('some value');
  });

  it('returns an async function result', () => {
    const fn = jest.fn().mockResolvedValue('resolved value');
    const wrappedFn = wrapInMacrotask(fn);

    const promise = wrappedFn();

    jest.runOnlyPendingTimers();

    return expect(promise).resolves.toBe('resolved value');
  });

  it('returns a rejected if the original function throws', () => {
    const fn = jest.fn().mockImplementation(() => {
      throw new Error('some error');
    });
    const wrappedFn = wrapInMacrotask(fn);

    const promise = wrappedFn();

    jest.runAllTimers();

    return expect(promise).rejects.toThrow('some error');
  });

  it('returns a rejected promise if the original function return a rejected promise', () => {
    const fn = jest.fn().mockRejectedValue(new Error('some error'));
    const wrappedFn = wrapInMacrotask(fn);

    const promise = wrappedFn();

    jest.runAllTimers();

    return expect(promise).rejects.toThrow('some error');
  });
});
