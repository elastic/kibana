/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import type { RevertFunction } from './form_changes';
import { useFormChanges } from './form_changes';

describe('useFormChanges', () => {
  it('should return correct contract', () => {
    const { result } = renderHook(useFormChanges);

    expect(result.current).toEqual({
      count: 0,
      report: expect.any(Function),
    });
  });

  it('should increase count when field changes', () => {
    const { result } = renderHook(useFormChanges);

    expect(result.current.count).toEqual(0);

    act(() => {
      result.current.report(false);
    });

    expect(result.current.count).toEqual(1);
  });

  it('should decrease count when field changes back', () => {
    const { result } = renderHook(useFormChanges);

    expect(result.current.count).toEqual(0);

    let revert: RevertFunction | undefined;
    act(() => {
      revert = result.current.report(false);
    });

    expect(revert).not.toBeUndefined();
    expect(result.current.count).toEqual(1);

    act(() => {
      revert!();
    });

    expect(result.current.count).toEqual(0);
  });

  it('should not increase count when field remains unchanged', () => {
    const { result } = renderHook(useFormChanges);

    expect(result.current.count).toEqual(0);

    let revert: RevertFunction | undefined;
    act(() => {
      revert = result.current.report(true);
    });

    expect(revert).toBeUndefined();
    expect(result.current.count).toEqual(0);
  });
});
