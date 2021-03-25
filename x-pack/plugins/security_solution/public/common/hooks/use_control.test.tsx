/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useControl, UseControlsReturn } from './use_control';

describe('useControl', () => {
  it('init', async () => {
    const { result } = renderHook<{}, UseControlsReturn>(() => useControl());
    expect(result.current.isControlOpen).toBe(false);
  });

  it('should open the control', async () => {
    const { result } = renderHook<{}, UseControlsReturn>(() => useControl());

    act(() => {
      result.current.openControl();
    });

    expect(result.current.isControlOpen).toBe(true);
  });

  it('should close the control', async () => {
    const { result } = renderHook<{}, UseControlsReturn>(() => useControl());

    act(() => {
      result.current.openControl();
    });

    expect(result.current.isControlOpen).toBe(true);

    act(() => {
      result.current.closeControl();
    });

    expect(result.current.isControlOpen).toBe(false);
  });
});
