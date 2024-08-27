/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../../common/mock';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { renderHook } from '@testing-library/react';
import { useTimelineColumns } from './use_timeline_columns';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { defaultHeaders } from '../../body/column_headers/default_headers';
import type { ColumnHeaderOptions } from '../../../../../../common/types/timeline/columns';

jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('useTimelineColumns', () => {
  const mockColumns: ColumnHeaderOptions[] = [
    {
      columnHeaderType: 'not-filtered',
      id: 'source.ip',
      initialWidth: 150,
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'agent.type',
      initialWidth: 150,
    },
  ];
  describe('defaultColumns', () => {
    it('should return the default columns', () => {
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.defaultColumns).toEqual(defaultHeaders);
    });

    it('should return the default unified data table (udt) columns', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.defaultColumns).toEqual(defaultUdtHeaders);
    });
  });

  describe('localColumns', () => {
    it('should return the default columns', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.localColumns).toEqual([]);
    });

    it('should return the default unified data table (udt) columns', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.localColumns).toEqual([]);
    });

    it('should return the provided columns', () => {
      const { result } = renderHook(() => useTimelineColumns(mockColumns), {
        wrapper: TestProviders,
      });
      expect(result.current.localColumns).toEqual(mockColumns);
    });
  });

  describe('augmentedColumnHeaders', () => {
    it('should return the default columns', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.augmentedColumnHeaders).toMatchSnapshot();
    });

    it('should return the default unified data table (udt) columns', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.augmentedColumnHeaders).toMatchSnapshot();
    });

    it('should return the provided columns', () => {
      const { result } = renderHook(() => useTimelineColumns(mockColumns), {
        wrapper: TestProviders,
      });
      expect(result.current.augmentedColumnHeaders).toMatchSnapshot();
    });
  });

  describe('getTimelineQueryFieldsFromColumns', () => {
    it('should return the list of all the fields', () => {
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.timelineQueryFieldsFromColumns).toMatchSnapshot();
    });
    it('should have a width of 152 for 5 actions', () => {
      const { result } = renderHook(() => useTimelineColumns(mockColumns), {
        wrapper: TestProviders,
      });
      expect(result.current.timelineQueryFieldsFromColumns).toMatchSnapshot();
    });
  });
});
