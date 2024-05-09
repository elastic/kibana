/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from './use_kibana';
import { useUsageTracker } from './use_usage_tracker';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

describe('useUsageTracker', () => {
  let reportUiCounter: jest.Mock;

  beforeEach(() => {
    reportUiCounter = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: { usageCollection: { reportUiCounter } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns bound functions for tracking usage', () => {
    const { result } = renderHook(() => useUsageTracker());

    expect(typeof result.current?.click).toBe('function');
    expect(typeof result.current?.count).toBe('function');
    expect(typeof result.current?.load).toBe('function');
  });

  it('calls reportUiCounter with correct arguments for click', () => {
    const { result } = renderHook(() => useUsageTracker());

    result.current?.click('button_click');

    expect(reportUiCounter).toHaveBeenCalledWith('search_playground', 'click', 'button_click');
  });

  it('calls reportUiCounter with correct arguments for count', () => {
    const { result } = renderHook(() => useUsageTracker());

    result.current?.count('item_count');

    expect(reportUiCounter).toHaveBeenCalledWith('search_playground', 'count', 'item_count');
  });

  it('calls reportUiCounter with correct arguments for load', () => {
    const { result } = renderHook(() => useUsageTracker());

    result.current?.load('page_loaded');

    expect(reportUiCounter).toHaveBeenCalledWith('search_playground', 'loaded', 'page_loaded');
  });

  it('does not  reportUiCounter if usageCollection is not loaded properly', () => {
    reportUiCounter = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: { usageCollection: undefined },
    });

    const { result } = renderHook(() => useUsageTracker());

    result.current?.load('page_loaded');

    expect(reportUiCounter).toHaveBeenCalledTimes(0);
  });
});
