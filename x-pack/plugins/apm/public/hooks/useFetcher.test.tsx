/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cleanup, renderHook } from 'react-hooks-testing-library';
import { delay } from '../utils/testHelpers';
import { useFetcher } from './useFetcher';

afterEach(cleanup);

// Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
/* tslint:disable:no-console */
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('useFetcher', () => {
  let output: ReturnType<typeof renderHook>;
  beforeEach(() => {
    jest.useFakeTimers();
    async function fn() {
      await delay(500);
      return 'response from hook';
    }
    output = renderHook(() => useFetcher(() => fn(), []));
  });

  it('should initially be empty', async () => {
    expect(output.result.current).toEqual({
      data: undefined,
      error: undefined,
      status: undefined
    });
  });

  it('should show loading spinner', async () => {
    await output.waitForNextUpdate();
    expect(output.result.current).toEqual({
      data: undefined,
      error: undefined,
      status: 'loading'
    });
  });

  it('should show success after 1 second', async () => {
    jest.advanceTimersByTime(1000);
    await output.waitForNextUpdate();

    expect(output.result.current).toEqual({
      data: 'response from hook',
      error: undefined,
      status: 'success'
    });
  });
});
