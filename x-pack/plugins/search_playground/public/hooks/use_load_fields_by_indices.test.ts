/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useLoadFieldsByIndices } from './use_load_fields_by_indices';
import { useUsageTracker } from './use_usage_tracker';
import { useIndicesFields } from './use_indices_fields';
import { createQuery, getDefaultQueryFields, getDefaultSourceFields } from '../utils/create_query';
import { AnalyticsEvents } from '../analytics/constants';
import { ChatFormFields } from '../types';

// Mock dependencies
jest.mock('./use_usage_tracker');
jest.mock('./use_indices_fields');
jest.mock('../utils/create_query');

describe('useLoadFieldsByIndices', () => {
  const mockSetValue = jest.fn();
  const mockGetValues = jest.fn();
  const mockWatch = jest.fn();
  const mockUsageTracker = { count: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    useUsageTracker.mockReturnValue(mockUsageTracker);
    useIndicesFields.mockReturnValue({ fields: {} });
    getDefaultQueryFields.mockReturnValue({ newIndex: ['title', 'body'] });
    getDefaultSourceFields.mockReturnValue({ testIndex: ['content'] });
    createQuery.mockReturnValue('mocked query');
  });

  const setup = () => {
    return renderHook(() =>
      useLoadFieldsByIndices({
        watch: mockWatch,
        setValue: mockSetValue,
        getValues: mockGetValues,
      })
    );
  };

  it('sets values and tracks usage on fields change', () => {
    useIndicesFields.mockReturnValue({ fields: { newIndex: {}, testIndex: {} } });
    mockGetValues.mockReturnValueOnce([{}, {}]);
    mockWatch.mockReturnValue(['index1']);

    setup();

    expect(mockSetValue).toHaveBeenCalledWith(ChatFormFields.elasticsearchQuery, 'mocked query');
    expect(mockSetValue).toHaveBeenCalledWith(ChatFormFields.queryFields, {
      newIndex: ['title', 'body'],
    });
    expect(mockSetValue).toHaveBeenCalledWith(ChatFormFields.sourceFields, {
      testIndex: ['content'],
    });
    expect(mockUsageTracker.count).toHaveBeenCalledWith(AnalyticsEvents.sourceFieldsLoaded, 2);
  });

  describe('merge fields', () => {
    it('save changed fields', () => {
      getDefaultQueryFields.mockReturnValue({ index: ['title', 'body'] });
      getDefaultSourceFields.mockReturnValue({ index: ['title'] });
      mockGetValues.mockReturnValueOnce([{ index: [] }, { index: ['body'] }]);

      setup();

      expect(mockSetValue).toHaveBeenNthCalledWith(2, ChatFormFields.queryFields, {
        index: [],
      });
      expect(mockSetValue).toHaveBeenNthCalledWith(3, ChatFormFields.sourceFields, {
        index: ['body'],
      });
    });

    it('remove old indices from fields', () => {
      getDefaultQueryFields.mockReturnValue({ index: ['title', 'body'] });
      getDefaultSourceFields.mockReturnValue({ index: ['title'] });
      mockGetValues.mockReturnValueOnce([
        { index: [], oldIndex: ['title'] },
        { index: ['body'], oldIndex: ['title'] },
      ]);

      setup();

      expect(mockSetValue).toHaveBeenNthCalledWith(2, ChatFormFields.queryFields, {
        index: [],
      });
      expect(mockSetValue).toHaveBeenNthCalledWith(3, ChatFormFields.sourceFields, {
        index: ['body'],
      });
    });

    it('add new indices to fields', () => {
      getDefaultQueryFields.mockReturnValue({ index: ['title', 'body'], newIndex: ['content'] });
      getDefaultSourceFields.mockReturnValue({ index: ['title'], newIndex: ['content'] });
      mockGetValues.mockReturnValueOnce([
        { index: [], oldIndex: ['title'] },
        { index: ['body'], oldIndex: ['title'] },
      ]);

      setup();

      expect(mockSetValue).toHaveBeenNthCalledWith(2, ChatFormFields.queryFields, {
        index: [],
        newIndex: ['content'],
      });
      expect(mockSetValue).toHaveBeenNthCalledWith(3, ChatFormFields.sourceFields, {
        index: ['body'],
        newIndex: ['content'],
      });
    });
  });
});
