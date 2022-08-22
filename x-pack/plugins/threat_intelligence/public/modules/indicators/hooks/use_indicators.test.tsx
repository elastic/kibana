/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  useIndicators,
  RawIndicatorsResponse,
  UseIndicatorsParams,
  UseIndicatorsValue,
} from './use_indicators';
import { BehaviorSubject, throwError } from 'rxjs';
import { TestProvidersComponent, mockedSearchService } from '../../../common/mocks/test_providers';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';

const indicatorsResponse = { rawResponse: { hits: { hits: [], total: 0 } } };

const useIndicatorsParams: UseIndicatorsParams = {
  filters: [],
  filterQuery: { query: '', language: 'kuery' },
};

describe('useIndicators()', () => {
  beforeEach(jest.clearAllMocks);

  describe('when mounted', () => {
    beforeEach(() => {
      mockedSearchService.search.mockReturnValue(new BehaviorSubject(indicatorsResponse));
    });

    beforeEach(async () => {
      renderHook<UseIndicatorsParams, UseIndicatorsValue>(
        () => useIndicators(useIndicatorsParams),
        {
          wrapper: TestProvidersComponent,
        }
      );
    });

    it('should query the database for threat indicators', async () => {
      expect(mockedSearchService.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('when filters change', () => {
    beforeEach(() => {
      mockedSearchService.search.mockReturnValue(new BehaviorSubject(indicatorsResponse));
    });

    it('should query the database again and reset page to 0', async () => {
      const hookResult = renderHook<UseIndicatorsParams, UseIndicatorsValue>(
        (props) => useIndicators(props),
        {
          initialProps: useIndicatorsParams,
          wrapper: TestProvidersComponent,
        }
      );

      expect(mockedSearchService.search).toHaveBeenCalledTimes(1);
      expect(mockedSearchService.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ body: expect.objectContaining({ from: 0 }) }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );

      // Change page
      await act(async () => hookResult.result.current.onChangePage(42));

      expect(mockedSearchService.search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ body: expect.objectContaining({ from: 42 * 25 }) }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );

      expect(mockedSearchService.search).toHaveBeenCalledTimes(2);

      // Change filters
      act(() =>
        hookResult.rerender({
          ...useIndicatorsParams,
          filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
        })
      );

      // From range should be reset to 0
      expect(mockedSearchService.search).toHaveBeenCalledTimes(3);
      expect(mockedSearchService.search).toHaveBeenLastCalledWith(
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
      mockedSearchService.search.mockReturnValue(throwError(() => new Error('some random error')));

      renderHook<UseIndicatorsParams, UseIndicatorsValue>((props) => useIndicators(props), {
        initialProps: useIndicatorsParams,
        wrapper: TestProvidersComponent,
      });
    });

    it('should show an error', async () => {
      expect(mockedSearchService.showError).toHaveBeenCalledTimes(1);

      expect(mockedSearchService.search).toHaveBeenCalledWith(
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
      mockedSearchService.search.mockReturnValue(
        new BehaviorSubject<IKibanaSearchResponse<RawIndicatorsResponse>>({
          rawResponse: { hits: { hits: [{ fields: {} }], total: 1 } },
        })
      );
    });

    it('should call mapping function on every hit', async () => {
      const { result } = renderHook<UseIndicatorsParams, UseIndicatorsValue>(
        (props) => useIndicators(props),
        {
          initialProps: useIndicatorsParams,
          wrapper: TestProvidersComponent,
        }
      );
      expect(result.current.indicatorCount).toEqual(1);
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      mockedSearchService.search.mockReturnValue(
        new BehaviorSubject<IKibanaSearchResponse<RawIndicatorsResponse>>({
          rawResponse: { hits: { hits: [{ fields: {} }], total: 1 } },
        })
      );
    });

    describe('when page changes', () => {
      it('should run the query again with pagination parameters', async () => {
        const { result } = renderHook<UseIndicatorsParams, UseIndicatorsValue>(
          () => useIndicators(useIndicatorsParams),
          {
            wrapper: TestProvidersComponent,
          }
        );

        await act(async () => {
          result.current.onChangePage(42);
        });

        expect(mockedSearchService.search).toHaveBeenCalledTimes(2);

        expect(mockedSearchService.search).toHaveBeenCalledWith(
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

        expect(mockedSearchService.search).toHaveBeenLastCalledWith(
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
          const { result } = renderHook<UseIndicatorsParams, UseIndicatorsValue>(
            () => useIndicators(useIndicatorsParams),
            {
              wrapper: TestProvidersComponent,
            }
          );

          await act(async () => {
            result.current.onChangeItemsPerPage(50);
          });

          expect(mockedSearchService.search).toHaveBeenCalledTimes(3);

          expect(mockedSearchService.search).toHaveBeenCalledWith(
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

          expect(mockedSearchService.search).toHaveBeenLastCalledWith(
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
