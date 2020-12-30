/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withOptionalSignal } from './with_optional_signal';

type TestFn = ({ number, signal }: { number: number; signal: AbortSignal }) => boolean;

describe('withOptionalSignal', () => {
  it('does not require a signal on the returned function', () => {
    const fn = jest.fn().mockReturnValue('hello') as TestFn;

    const wrappedFn = withOptionalSignal(fn);

    expect(wrappedFn({ number: 1 })).toEqual('hello');
  });

  it('will pass a given signal to the wrapped function', () => {
    const fn = jest.fn().mockReturnValue('hello') as TestFn;
    const { signal } = new AbortController();

    const wrappedFn = withOptionalSignal(fn);

    wrappedFn({ number: 1, signal });
    expect(fn).toHaveBeenCalledWith({ number: 1, signal });
  });
});
