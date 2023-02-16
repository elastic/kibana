/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useSetFieldValueWithCallback } from './use_set_field_value_cb';

const field = 'theField';
const setFieldValue = jest.fn();
const initialValue = 'initial value';
const initialProps = { field, setFieldValue, value: initialValue };
const newValue = 'new value';
const callback = jest.fn();

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
    rerender({ field, setFieldValue, value: newValue });
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
