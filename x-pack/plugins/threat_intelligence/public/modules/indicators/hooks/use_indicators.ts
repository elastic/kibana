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
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useInspector } from '../../../hooks/use_inspector';
import { Indicator } from '../../../../common/types/indicator';
import { useKibana } from '../../../hooks/use_kibana';
import { useSourcererDataView } from './use_sourcerer_data_view';
import { getRuntimeMappings } from '../lib/get_runtime_mappings';
import { getIndicatorsQuery } from '../lib/get_indicators_query';

const PAGE_SIZES = [10, 25, 50];

export const DEFAULT_PAGE_SIZE = PAGE_SIZES[1];

export interface UseIndicatorsParams {
  filterQuery: Query;
  filters: Filter[];
  timeRange?: TimeRange;
  sorting: any[];
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
  sorting,
  timeRange,
}: UseIndicatorsParams): UseIndicatorsValue => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();
  const { selectedPatterns } = useSourcererDataView();

  const { inspectorAdapters } = useInspector();

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

  const query = useMemo(
    () => getIndicatorsQuery({ filters, timeRange, filterQuery }),
    [filterQuery, filters, timeRange]
  );

  const loadData = useCallback(
    async (from: number, size: number) => {
      abortController.current = new AbortController();

      setLoading(true);

      const request = inspectorAdapters.requests.start('Indicator search', {});

      request.stats({
        indexPattern: {
          label: 'Index patterns',
          value: selectedPatterns,
        },
      });

      const requestBody = {
        query,
        runtime_mappings: getRuntimeMappings(),
        fields: [{ field: '*', include_unmapped: true }],
        size,
        from,
        sort: sorting.map(({ id, direction }) => ({ [id]: direction })),
      };

      searchSubscription$.current = searchService
        .search<IEsSearchRequest, IKibanaSearchResponse<RawIndicatorsResponse>>(
          {
            params: {
              index: selectedPatterns,
              body: requestBody,
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
              request.stats({}).ok({ json: response });
              request.json(requestBody);
            } else if (isErrorResponse(response)) {
              setLoading(false);
              request.error({ json: response });
              searchSubscription$.current?.unsubscribe();
            }
          },
          error: (requestError) => {
            searchService.showError(requestError);
            searchSubscription$.current?.unsubscribe();

            if (requestError instanceof Error && requestError.name.includes('Abort')) {
              inspectorAdapters.requests.reset();
            } else {
              request.error({ json: requestError });
            }

            setLoading(false);
          },
        });
    },
    [inspectorAdapters.requests, query, searchService, selectedPatterns, sorting]
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
