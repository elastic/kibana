/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useIndicators, RawIndicatorsResponse } from './use_indicators';
import { BehaviorSubject, throwError } from 'rxjs';
import { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { mockSearchService } from '../../../common/mocks/mock_kibana_search_service';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';

jest.mock('../../../hooks/use_kibana');

const indicatorsResponse = { rawResponse: { hits: { hits: [], total: 0 } } };

describe('useIndicators()', () => {
  let mockSearch: ReturnType<typeof mockSearchService>;

  describe('when mounted', () => {
    beforeEach(() => {
      mockSearch = mockSearchService(new BehaviorSubject(indicatorsResponse));
    });

    beforeEach(async () => {
      renderHook(() => useIndicators());
    });

    it('should query the database for threat indicators', async () => {
      expect(mockSearch.search).toHaveBeenCalledTimes(1);
    });

    it('should retrieve index patterns from settings', () => {
      expect(mockSearch.getUiSetting).toHaveBeenCalledWith(DEFAULT_THREAT_INDEX_KEY);
    });
  });

  describe('when query fails', () => {
    beforeEach(async () => {
      mockSearch = mockSearchService(throwError(() => new Error('some random error')));

      renderHook(() => useIndicators());
    });

    it('should show an error', async () => {
      expect(mockSearch.showError).toHaveBeenCalledTimes(1);

      expect(mockSearch.search).toHaveBeenCalledWith(
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
      mockSearch = mockSearchService(
        new BehaviorSubject<IKibanaSearchResponse<RawIndicatorsResponse>>({
          rawResponse: { hits: { hits: [{ fields: {} }], total: 1 } },
        })
      );
    });

    it('should call mapping function on every hit', async () => {
      const { result } = renderHook(() => useIndicators());

      expect(result.current.indicatorCount).toEqual(1);
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      mockSearch = mockSearchService(
        new BehaviorSubject<IKibanaSearchResponse<RawIndicatorsResponse>>({
          rawResponse: { hits: { hits: [{ fields: {} }], total: 1 } },
        })
      );
    });

    describe('when page changes', () => {
      it('should run the query again with pagination parameters', async () => {
        const { result } = renderHook(() => useIndicators());

        await act(async () => {
          result.current.onChangePage(42);
        });

        expect(mockSearch.search).toHaveBeenCalledTimes(2);

        expect(mockSearch.search).toHaveBeenCalledWith(
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

        expect(mockSearch.search).toHaveBeenLastCalledWith(
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
          const { result } = renderHook(() => useIndicators());

          await act(async () => {
            result.current.onChangeItemsPerPage(50);
          });

          expect(mockSearch.search).toHaveBeenCalledTimes(2);

          expect(mockSearch.search).toHaveBeenCalledWith(
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

          expect(mockSearch.search).toHaveBeenLastCalledWith(
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
