/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
} from '@kbn/data-plugin/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { Indicator } from '../../../../common/types/Indicator';
import { useKibana } from '../../../hooks/use_kibana';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';

const PAGE_SIZES = [10, 25, 50];

export const DEFAULT_PAGE_SIZE = PAGE_SIZES[1];

export interface UseIndicatorsValue {
  loadData: (from: number, size: number) => void;
  indicators: Indicator[];
  indicatorCount: number;
  pagination: Pagination;
  onChangeItemsPerPage: (value: number) => void;
  onChangePage: (value: number) => void;
  firstLoad: boolean;
}

export interface RawIndicatorsResponse {
  hits: {
    hits: any[];
    total: number;
  };
}

interface Pagination {
  pageSize: number;
  pageIndex: number;
  pageSizeOptions: number[];
}

export const useIndicators = (): UseIndicatorsValue => {
  const {
    services: {
      data: { search: searchService },
      uiSettings,
    },
  } = useKibana();

  const defaultThreatIndices = uiSettings.get<string[]>(DEFAULT_THREAT_INDEX_KEY);

  const searchSubscription$ = useRef(new Subscription());
  const abortController = useRef(new AbortController());

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorCount, setIndicatorCount] = useState<number>(0);
  const [firstLoad, setFirstLoad] = useState(true);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
  });

  const refresh = useCallback(
    async (from: number, size: number) => {
      abortController.current = new AbortController();

      searchSubscription$.current = searchService
        .search<IEsSearchRequest, IKibanaSearchResponse<RawIndicatorsResponse>>(
          {
            params: {
              index: defaultThreatIndices,
              body: {
                size,
                from,
                fields: [{ field: '*', include_unmapped: true }],
                query: {
                  bool: {
                    must: [
                      {
                        term: {
                          'event.category': {
                            value: 'threat',
                          },
                        },
                      },
                      {
                        term: {
                          'event.type': {
                            value: 'indicator',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            abortSignal: abortController.current.signal,
          }
        )
        .subscribe({
          next: (response) => {
            setIndicators(response.rawResponse.hits.hits);
            setIndicatorCount(response.rawResponse.hits.total || 0);

            if (isCompleteResponse(response)) {
              searchSubscription$.current.unsubscribe();
            } else if (isErrorResponse(response)) {
              searchSubscription$.current.unsubscribe();
            }

            setFirstLoad(false);
          },
          error: (msg) => {
            searchService.showError(msg);
            searchSubscription$.current.unsubscribe();

            setFirstLoad(false);
          },
        });
    },
    [searchService]
  );

  const onChangeItemsPerPage = useCallback(
    async (pageSize) => {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      }));

      refresh(0, pageSize);
    },
    [refresh, setPagination]
  );

  const onChangePage = useCallback(
    async (pageIndex) => {
      setPagination((currentPagination) => ({ ...currentPagination, pageIndex }));
      refresh(pageIndex * pagination.pageSize, pagination.pageSize);
    },
    [pagination.pageSize, refresh]
  );

  useEffect(() => {
    refresh(0, DEFAULT_PAGE_SIZE);

    return () => abortController.current.abort();
  }, [refresh]);

  return {
    loadData: refresh,
    indicators,
    indicatorCount,
    pagination,
    onChangePage,
    onChangeItemsPerPage,
    firstLoad,
  };
};
