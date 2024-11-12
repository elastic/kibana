/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useSetFieldValueWithCallback } from './use_set_field_value_cb';

const initialValue = 'initial value';
const newValue = 'new value';
const callback = jest.fn();
const initialProps = { field: 'theField', setFieldValue: () => {}, value: initialValue };

describe('set field value callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('invokes the callback after value is set', () => {
    const { result, rerender } = renderHook((props) => useSetFieldValueWithCallback(props), {
      initialProps,
    });
    act(() => {
      result.current(newValue, callback);
    });
    rerender({ ...initialProps, value: newValue });
    expect(callback).toHaveBeenCalled();
  });
  it('invokes the callback after value is set to equal value', () => {
    const { result, rerender } = renderHook((props) => useSetFieldValueWithCallback(props), {
      initialProps,
    });
    act(() => {
      result.current(initialValue, callback);
    });
    rerender();
    expect(callback).toHaveBeenCalled();
  });
  it('does not invoke the callback if value does not update', () => {
    const { result, rerender } = renderHook((props) => useSetFieldValueWithCallback(props), {
      initialProps,
    });
    act(() => {
      result.current(newValue, callback);
    });
    rerender();
    expect(callback).not.toHaveBeenCalled();
  });
});
