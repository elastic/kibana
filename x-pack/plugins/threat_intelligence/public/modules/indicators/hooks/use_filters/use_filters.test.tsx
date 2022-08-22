/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockUseKibanaForFilters } from '../../../../common/mocks/mock_use_kibana_for_filters';
import { renderHook, act, RenderHookResult, Renderer } from '@testing-library/react-hooks';
import { useFilters, UseFiltersValue } from './use_filters';

import { useHistory, useLocation } from 'react-router-dom';
import { Filter } from '@kbn/es-query';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  useHistory: jest.fn().mockReturnValue({ replace: jest.fn() }),
}));

describe('useFilters()', () => {
  let hookResult: RenderHookResult<{}, UseFiltersValue, Renderer<unknown>>;
  let mockRef: ReturnType<typeof mockUseKibanaForFilters>;

  describe('when mounted', () => {
    beforeEach(async () => {
      mockRef = mockUseKibanaForFilters();

      hookResult = renderHook(() => useFilters(), {
        wrapper: TestProvidersComponent,
      });
    });

    it('should have valid initial filterQuery value', () => {
      expect(hookResult.result.current.filterQuery).toMatchObject({ language: 'kuery', query: '' });
    });

    describe('when query string is populated', () => {
      it('should try to compute the initial state based on query string', async () => {
        (useLocation as jest.Mock).mockReturnValue({
          search:
            '?indicators=(filterQuery:(language:kuery,query:%27threat.indicator.type%20:%20"file"%20%27),filters:!(),timeRange:(from:now/d,to:now/d))',
        });

        hookResult = renderHook(() => useFilters(), {
          wrapper: TestProvidersComponent,
        });

        expect(hookResult.result.current.filterQuery).toMatchObject({
          language: 'kuery',
          query: 'threat.indicator.type : "file" ',
        });
      });
    });
  });

  describe('when filter values change', () => {
    const historyReplace = jest.fn();
    beforeEach(async () => {
      mockRef = mockUseKibanaForFilters();

      hookResult = renderHook(() => useFilters(), {
        wrapper: TestProvidersComponent,
      });

      (useHistory as jest.Mock).mockReturnValue({ replace: historyReplace });

      historyReplace.mockClear();
    });

    describe('when filters change', () => {
      it('should update history entry', async () => {
        const newFilterEntry = { query: { filter: 'new_filter' }, meta: {} };

        // Make sure new filter value is returned from filter manager before signalling an update
        // to subscribers
        mockRef.getFilters.mockReturnValue([newFilterEntry] as Filter[]);

        // Emit the filterManager update to see how it propagates to local component state
        await act(async () => {
          mockRef.$filterUpdates.next(void 0);
        });

        // Internally, filters should be loaded from filterManager
        expect(mockRef.getFilters).toHaveBeenCalled();

        // Serialized into browser query string
        expect(historyReplace).toHaveBeenCalledWith(
          expect.objectContaining({ search: expect.stringMatching(/new_filter/) })
        );

        // And updated in local hook state
        expect(hookResult.result.current.filters).toContain(newFilterEntry);
      });
    });

    describe('when time range changes', () => {
      const newTimeRange = { from: 'dawnOfTime', to: 'endOfTime' };

      const updateTime = async () => {
        // After new time range is selected
        await act(async () => {
          hookResult.result.current.handleSubmitTimeRange(newTimeRange);
        });
      };

      it('should update its local state', async () => {
        expect(hookResult.result.current.timeRange).toBeDefined();
        expect(hookResult.result.current.timeRange).not.toEqual(newTimeRange);

        // After new time range is selected
        await updateTime();

        // Local filter state should be updated
        expect(hookResult.result.current.timeRange).toEqual(newTimeRange);
      });

      it('should update history entry', async () => {
        expect(historyReplace).not.toHaveBeenCalledWith(
          expect.objectContaining({ search: expect.stringMatching(/dawnOfTime/) })
        );

        // After new time range is selected
        await updateTime();

        // Query string should be updated
        expect(historyReplace).toHaveBeenCalledWith(
          expect.objectContaining({ search: expect.stringMatching(/dawnOfTime/) })
        );
      });
    });

    describe('when filterQuery changes', () => {
      beforeEach(async () => {
        // After new time range is selected
        await act(async () => {
          hookResult.result.current.handleSubmitQuery({
            query: 'threat.indicator.type : *',
            language: 'kuery',
          });
        });
      });

      it('should update history entry', async () => {
        expect(historyReplace).toHaveBeenCalledWith(
          expect.objectContaining({ search: expect.stringMatching(/threat\.indicator\.type/) })
        );
      });

      it('should update local state', () => {
        expect(hookResult.result.current.filterQuery).toMatchObject({
          language: 'kuery',
          query: 'threat.indicator.type : *',
        });
      });
    });
  });
});
