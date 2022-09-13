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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import { buildEsQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Indicator } from '../../../../common/types/indicator';
import { useKibana } from '../../../hooks/use_kibana';
import { THREAT_QUERY_BASE } from '../../../../common/constants';
import { useSourcererDataView } from './use_sourcerer_data_view';
import { threatIndicatorNamesOriginScript, threatIndicatorNamesScript } from '../lib/display_name';

const PAGE_SIZES = [10, 25, 50];

export const DEFAULT_PAGE_SIZE = PAGE_SIZES[1];

export interface UseIndicatorsParams {
  filterQuery: Query;
  filters: Filter[];
  timeRange?: TimeRange;
}

export interface UseIndicatorsValue {
  handleRefresh: () => void;
  indicators: Indicator[];
  indicatorCount: number;
  pagination: Pagination;
  onChangeItemsPerPage: (value: number) => void;
  onChangePage: (value: number) => void;
  loading: boolean;
}

export interface RawIndicatorsResponse {
  hits: {
    hits: any[];
    total: number;
  };
}

export interface Pagination {
  pageSize: number;
  pageIndex: number;
  pageSizeOptions: number[];
}

export const useIndicators = ({
  filters,
  filterQuery,
  timeRange,
}: UseIndicatorsParams): UseIndicatorsValue => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const { selectedPatterns } = useSourcererDataView();

  const searchSubscription$ = useRef<Subscription>();
  const abortController = useRef(new AbortController());

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorCount, setIndicatorCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: PAGE_SIZES,
  });

  const queryToExecute = useMemo(
    () =>
      buildEsQuery(
        undefined,
        [
          {
            query: THREAT_QUERY_BASE,
            language: 'kuery',
          },
          {
            query: filterQuery.query as string,
            language: 'kuery',
          },
        ],
        [
          ...filters,
          {
            query: {
              range: {
                ['@timestamp']: {
                  gte: timeRange?.from,
                  lte: timeRange?.to,
                },
              },
            },
            meta: {},
          },
        ]
      ),
    [filterQuery, filters, timeRange?.from, timeRange?.to]
  );

  const loadData = useCallback(
    async (from: number, size: number) => {
      abortController.current = new AbortController();

      setLoading(true);

      searchSubscription$.current = searchService
        .search<IEsSearchRequest, IKibanaSearchResponse<RawIndicatorsResponse>>(
          {
            params: {
              index: selectedPatterns,
              body: {
                size,
                from,
                fields: [{ field: '*', include_unmapped: true }],
                query: queryToExecute,
                runtime_mappings: {
                  'threat.indicator.name': {
                    type: 'keyword',
                    script: {
                      source: threatIndicatorNamesScript(),
                    },
                  },
                  'threat.indicator.name_origin': {
                    type: 'keyword',
                    script: {
                      source: threatIndicatorNamesOriginScript(),
                    },
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
              setLoading(false);
              searchSubscription$.current?.unsubscribe();
            } else if (isErrorResponse(response)) {
              setLoading(false);
              searchSubscription$.current?.unsubscribe();
            }
          },
          error: (msg) => {
            searchService.showError(msg);
            searchSubscription$.current?.unsubscribe();

            setLoading(false);
          },
        });
    },
    [queryToExecute, searchService, selectedPatterns]
  );

  const onChangeItemsPerPage = useCallback(
    async (pageSize) => {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      }));

      loadData(0, pageSize);
    },
    [loadData]
  );

  const onChangePage = useCallback(
    async (pageIndex) => {
      setPagination((currentPagination) => ({ ...currentPagination, pageIndex }));
      loadData(pageIndex * pagination.pageSize, pagination.pageSize);
    },
    [loadData, pagination.pageSize]
  );

  const handleRefresh = useCallback(() => {
    onChangePage(0);
  }, [onChangePage]);

  // Initial data load (on mount)
  useEffect(() => {
    handleRefresh();

    return () => abortController.current.abort();
  }, [handleRefresh]);

  return {
    indicators,
    indicatorCount,
    pagination,
    onChangePage,
    onChangeItemsPerPage,
    loading,
    handleRefresh,
  };
};
