/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useTopNPopOver } from './utils';

describe('useTopNPopOver', () => {
  it('calls setIsPopoverVisible when toggling top N', () => {
    const setIsPopoverVisible = jest.fn();
    const {
      result: {
        current: { toggleTopN },
      },
    } = renderHook(() => useTopNPopOver(setIsPopoverVisible));

    act(() => {
      toggleTopN();
    });

    expect(setIsPopoverVisible).toHaveBeenCalled();
  });

  it('sets isShowingTopN to true when toggleTopN is called', () => {
    const { result } = renderHook(() => useTopNPopOver());

    expect(result.current.isShowingTopN).toBeFalsy();

    act(() => {
      result.current.toggleTopN();
    });

    expect(result.current.isShowingTopN).toBeTruthy();
  });

  it('sets isShowingTopN to false when toggleTopN is called for the second time', () => {
    const { result } = renderHook(() => useTopNPopOver());

    expect(result.current.isShowingTopN).toBeFalsy();

    act(() => {
      result.current.toggleTopN();
      result.current.toggleTopN();
    });

    expect(result.current.isShowingTopN).toBeFalsy();
  });

  it('sets isShowingTopN to false when closeTopN is called', () => {
    const { result } = renderHook(() => useTopNPopOver());
    act(() => {
      // First, make isShowingTopN truthy.
      result.current.toggleTopN();
    });
    expect(result.current.isShowingTopN).toBeTruthy();

    act(() => {
      result.current.closeTopN();
    });
    expect(result.current.isShowingTopN).toBeFalsy();
  });
});
