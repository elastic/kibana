/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../../../common/mock';
import { renderHook } from '@testing-library/react-hooks';
import { useTimelineColumns } from './use_timeline_columns';
import { defaultUdtHeaders } from '../../body/column_headers/default_headers';
import type { ColumnHeaderOptions } from '../../../../../../common/types/timeline/columns';

jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

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
    it('should return the default unified data table (udt) columns', () => {
      const { result } = renderHook(() => useTimelineColumns([]), {
        wrapper: TestProviders,
      });
      expect(result.current.defaultColumns).toEqual(defaultUdtHeaders);
    });
  });

  describe('localColumns', () => {
    it('should return the default unified data table (udt) columns', () => {
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
    it('should return the default unified data table (udt) columns', () => {
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
