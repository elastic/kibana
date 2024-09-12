/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reactRenderHook, act, waitFor } from '@testing-library/react';
import { useAsObservable } from './use_as_observable';

describe('useAsObservable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('provides and observable preserving a reference', () => {
    const { result, rerender } = reactRenderHook(useAsObservable, { initialProps: 1 });

    let observableValue;
    const subscriptionMock = jest.fn((v) => (observableValue = v));

    result.current.subscribe(subscriptionMock);

    expect(subscriptionMock).toHaveBeenCalledWith(1);
    expect(subscriptionMock).toHaveBeenCalledTimes(1);
    expect(observableValue).toEqual(1);

    act(() => rerender(1));

    expect(result.all[0]).toStrictEqual(result.all[1]);

    expect(subscriptionMock).toHaveBeenCalledWith(1);
    expect(subscriptionMock).toHaveBeenCalledTimes(1);
    expect(observableValue).toEqual(1);
  });

  test('updates the subject with a new value', async () => {
    const { result, rerender } = reactRenderHook(useAsObservable, {
      initialProps: 'test',
    });

    let observableValue;
    const subscriptionMock = jest.fn((v) => {
      observableValue = v;
    });
    result.current.subscribe(subscriptionMock);

    expect(subscriptionMock).toHaveBeenCalledWith('test');
    expect(observableValue).toEqual('test');

    await act(async () => {
      rerender('test update');
    });

    await waitFor(() => null);

    expect(subscriptionMock).toHaveBeenCalledTimes(2);
    expect(subscriptionMock).toHaveBeenCalledWith('test update');
    expect(observableValue).toEqual('test update');
  });
});
