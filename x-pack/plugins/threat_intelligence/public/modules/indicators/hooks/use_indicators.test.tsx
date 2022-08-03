/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useIndicators, RawIndicatorsResponse, UseIndicatorsParams } from './use_indicators';
import { BehaviorSubject, throwError } from 'rxjs';
import { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { mockKibanaDataService } from '../../../common/mocks/mock_kibana_data_service';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';

jest.mock('../../../hooks/use_kibana');

const indicatorsResponse = { rawResponse: { hits: { hits: [], total: 0 } } };

const useIndicatorsParams: UseIndicatorsParams = {
  filters: [],
  filterQuery: { query: '', language: 'kuery' },
};

describe('useIndicators()', () => {
  let mockData: ReturnType<typeof mockKibanaDataService>;

  describe('when mounted', () => {
    beforeEach(() => {
      mockData = mockKibanaDataService({ searchSubject: new BehaviorSubject(indicatorsResponse) });
    });

    beforeEach(async () => {
      renderHook(() => useIndicators(useIndicatorsParams));
    });

    it('should query the database for threat indicators', async () => {
      expect(mockData.search).toHaveBeenCalledTimes(1);
    });

    it('should retrieve index patterns from settings', () => {
      expect(mockData.getUiSetting).toHaveBeenCalledWith(DEFAULT_THREAT_INDEX_KEY);
    });
  });

  describe('when filters change', () => {
    beforeEach(() => {
      mockData = mockKibanaDataService({
        searchSubject: new BehaviorSubject(indicatorsResponse),
      });
    });

    it('should query the database again and reset page to 0', async () => {
      const hookResult = renderHook((props) => useIndicators(props), {
        initialProps: useIndicatorsParams,
      });

      expect(mockData.search).toHaveBeenCalledTimes(1);
      expect(mockData.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ body: expect.objectContaining({ from: 0 }) }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );

      // Change page
      await act(async () => hookResult.result.current.onChangePage(42));

      expect(mockData.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ body: expect.objectContaining({ from: 42 * 25 }) }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );

      expect(mockData.search).toHaveBeenCalledTimes(2);

      // Change filters
      act(() =>
        hookResult.rerender({
          ...useIndicatorsParams,
          filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
        })
      );

      // From range should be reset to 0
      expect(mockData.search).toHaveBeenCalledTimes(3);
      expect(mockData.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ body: expect.objectContaining({ from: 0 }) }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('when query fails', () => {
    beforeEach(async () => {
      mockData = mockKibanaDataService({
        searchSubject: throwError(() => new Error('some random error')),
      });

      renderHook((props) => useIndicators(props), {
        initialProps: useIndicatorsParams,
      });
    });

    it('should show an error', async () => {
      expect(mockData.showError).toHaveBeenCalledTimes(1);

      expect(mockData.search).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            body: expect.objectContaining({
              query: expect.any(Object),
              from: expect.any(Number),
              size: expect.any(Number),
              fields: expect.any(Array),
            }),
          }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('when query is successful', () => {
    beforeEach(async () => {
      mockData = mockKibanaDataService({
        searchSubject: new BehaviorSubject<IKibanaSearchResponse<RawIndicatorsResponse>>({
          rawResponse: { hits: { hits: [{ fields: {} }], total: 1 } },
        }),
      });
    });

    it('should call mapping function on every hit', async () => {
      const { result } = renderHook((props) => useIndicators(props), {
        initialProps: useIndicatorsParams,
      });
      expect(result.current.indicatorCount).toEqual(1);
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      mockData = mockKibanaDataService({
        searchSubject: new BehaviorSubject<IKibanaSearchResponse<RawIndicatorsResponse>>({
          rawResponse: { hits: { hits: [{ fields: {} }], total: 1 } },
        }),
      });
    });

    describe('when page changes', () => {
      it('should run the query again with pagination parameters', async () => {
        const { result } = renderHook(() => useIndicators(useIndicatorsParams));

        await act(async () => {
          result.current.onChangePage(42);
        });

        expect(mockData.search).toHaveBeenCalledTimes(2);

        expect(mockData.search).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              body: expect.objectContaining({
                size: 25,
                from: 0,
              }),
            }),
          }),
          expect.anything()
        );

        expect(mockData.search).toHaveBeenLastCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              body: expect.objectContaining({
                size: 25,
                from: 42 * 25,
              }),
            }),
          }),
          expect.anything()
        );

        expect(result.current.pagination.pageIndex).toEqual(42);
      });

      describe('when page size changes', () => {
        it('should fetch the first page and update internal page size', async () => {
          const { result } = renderHook(() => useIndicators(useIndicatorsParams));

          await act(async () => {
            result.current.onChangeItemsPerPage(50);
          });

          expect(mockData.search).toHaveBeenCalledTimes(3);

          expect(mockData.search).toHaveBeenCalledWith(
            expect.objectContaining({
              params: expect.objectContaining({
                body: expect.objectContaining({
                  size: 25,
                  from: 0,
                }),
              }),
            }),
            expect.anything()
          );

          expect(mockData.search).toHaveBeenLastCalledWith(
            expect.objectContaining({
              params: expect.objectContaining({
                body: expect.objectContaining({
                  size: 50,
                  from: 0,
                }),
              }),
            }),
            expect.anything()
          );

          expect(result.current.pagination.pageIndex).toEqual(0);
        });
      });
    });
  });
});
