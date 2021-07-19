/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useDebouncedValue } from './debounced_value';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

describe('useDebouncedValue', () => {
  it('should update upstream value changes', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() => useDebouncedValue({ value: 'a', onChange: onChangeMock }));

    act(() => {
      result.current.handleInputChange('b');
    });

    expect(onChangeMock).toHaveBeenCalledWith('b');
  });

  it('should fallback to initial value with empty string (by default)', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() => useDebouncedValue({ value: 'a', onChange: onChangeMock }));

    act(() => {
      result.current.handleInputChange('');
    });

    expect(onChangeMock).toHaveBeenCalledWith('a');
  });

  it('should allow empty input to be updated', () => {
    const onChangeMock = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedValue({ value: 'a', onChange: onChangeMock }, { allowFalsyValue: true })
    );

    act(() => {
      result.current.handleInputChange('');
    });

    expect(onChangeMock).toHaveBeenCalledWith('');
  });
});
