/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUsageTracker } from './use_usage_tracker';
import { useController } from 'react-hook-form';
import { useIndicesFields } from './use_indices_fields';
import { AnalyticsEvents } from '../analytics/constants';
import { useSourceIndicesFields } from './use_source_indices_field';

jest.mock('./use_usage_tracker');
jest.mock('react-hook-form');
jest.mock('./use_indices_fields');

describe('useSourceIndicesFields', () => {
  const mockUsageTracker = {
    count: jest.fn(),
  };
  const mockOnChange = jest.fn();
  const mockFields = ['field1', 'field2'];
  const mockSelectedIndices = ['index1', 'index2'];

  beforeEach(() => {
    jest.clearAllMocks();
    (useUsageTracker as jest.Mock).mockReturnValue(mockUsageTracker);
    (useController as jest.Mock).mockReturnValue({
      field: { value: mockSelectedIndices, onChange: mockOnChange },
    });
    (useIndicesFields as jest.Mock).mockReturnValue({
      fields: mockFields,
      isLoading: false,
    });
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useSourceIndicesFields());

    expect(result.current.indices).toEqual(mockSelectedIndices);
    expect(result.current.fields).toEqual(mockFields);
    expect(result.current.isFieldsLoading).toBe(false);
  });

  it('should add an index', () => {
    const { result } = renderHook(() => useSourceIndicesFields());
    act(() => {
      result.current.addIndex('newIndex');
    });

    expect(mockOnChange).toHaveBeenCalledWith([...mockSelectedIndices, 'newIndex']);
    expect(mockUsageTracker.count).toHaveBeenCalledWith(
      AnalyticsEvents.sourceIndexUpdated,
      mockSelectedIndices.length + 1
    );
  });

  it('should remove an index', () => {
    const { result } = renderHook(() => useSourceIndicesFields());
    act(() => {
      result.current.removeIndex('index1');
    });

    expect(mockOnChange).toHaveBeenCalledWith(['index2']);
    expect(mockUsageTracker.count).toHaveBeenCalledWith(
      AnalyticsEvents.sourceIndexUpdated,
      mockSelectedIndices.length - 1
    );
  });

  it('should set indices', () => {
    const { result } = renderHook(() => useSourceIndicesFields());
    const newIndices = ['index3', 'index4'];

    act(() => {
      result.current.setIndices(newIndices);
    });

    expect(mockOnChange).toHaveBeenCalledWith(newIndices);
    expect(mockUsageTracker.count).toHaveBeenCalledWith(
      AnalyticsEvents.sourceIndexUpdated,
      newIndices.length
    );
  });
});
