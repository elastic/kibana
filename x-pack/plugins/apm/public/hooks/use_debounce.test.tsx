/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useStateDebounced } from './use_debounce'; // Replace 'your-module' with the actual module path

describe('useStateDebounced', () => {
  jest.useFakeTimers();
  beforeAll(() => {
    // Mocks console.error so it won't polute tests output when testing the api throwing error
    jest.spyOn(console, 'error').mockImplementation(() => null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns the initial value and a debounced setter function', () => {
    const { result } = renderHook(() => useStateDebounced('initialValue', 300));

    const [debouncedValue, setValueDebounced] = result.current;

    expect(debouncedValue).toBe('initialValue');
    expect(typeof setValueDebounced).toBe('function');
  });

  it('updates debounced value after a delay when setter function is called', () => {
    const { result } = renderHook(() => useStateDebounced('initialValue'));

    act(() => {
      result.current[1]('updatedValue');
    });
    expect(result.current[0]).toBe('initialValue');
    jest.advanceTimersByTime(300);
    expect(result.current[0]).toBe('updatedValue');
  });

  it('cancels previous debounced updates when new ones occur', () => {
    const { result } = renderHook(() => useStateDebounced('initialValue', 400));

    act(() => {
      result.current[1]('updatedValue');
    });
    jest.advanceTimersByTime(150);
    expect(result.current[0]).toBe('initialValue');
    act(() => {
      result.current[1]('newUpdatedValue');
    });
    jest.advanceTimersByTime(400);
    expect(result.current[0]).toBe('newUpdatedValue');
  });
});
