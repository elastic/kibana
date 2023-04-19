/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  TimeRange,
} from '@kbn/data-plugin/common';

import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

import { AnalyticsCollectionDataViewLogic } from './analytics_collection_data_view_logic';

import {
  getBaseSearchTemplate,
  getPaginationRequestParams,
  getPaginationRequestSizeParams,
  getTotalCountRequestParams,
} from './analytics_collection_explore_table_formulas';
import {
  ExploreTableColumns,
  ExploreTableItem,
  ExploreTables,
  SearchTermsTable,
  TopClickedTable,
  TopReferrersTable,
  WorsePerformersTable,
} from './analytics_collection_explore_table_types';
import { AnalyticsCollectionToolbarLogic } from './analytics_collection_toolbar/analytics_collection_toolbar_logic';

const BASE_PAGE_SIZE = 10;

export interface Sorting<T extends ExploreTableItem = ExploreTableItem> {
  direction: 'asc' | 'desc';
  field: keyof T;
}

interface TableParams<T extends ExploreTableItem = ExploreTableItem> {
  parseResponse(response: IKibanaSearchResponse): { items: T[]; totalCount: number };
  requestParams(props: {
    pageIndex: number;
    pageSize: number;
    search: string;
    sorting: Sorting<T> | null;
    timeRange: TimeRange;
  }): IKibanaSearchRequest;
}

const tablesParams: {
  [ExploreTables.SearchTerms]: TableParams<SearchTermsTable>;
  [ExploreTables.TopClicked]: TableParams<TopClickedTable>;
  [ExploreTables.TopReferrers]: TableParams<TopReferrersTable>;
  [ExploreTables.WorsePerformers]: TableParams<WorsePerformersTable>;
} = {
  [ExploreTables.SearchTerms]: {
    parseResponse: (
      response: IKibanaSearchResponse<{
        aggregations: {
          searches: { buckets: Array<{ doc_count: number; key: string }> };
          totalCount: { value: number };
        };
      }>
    ) => ({
      items: response.rawResponse.aggregations.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.count]: bucket.doc_count,
        [ExploreTableColumns.searchTerms]: bucket.key,
      })),
      totalCount: response.rawResponse.aggregations.totalCount.value,
    }),
    requestParams: (
      { timeRange, sorting, pageIndex, pageSize, search },
      aggregationFieldName = 'search.query'
    ) =>
      getBaseSearchTemplate(
        aggregationFieldName,
        { search, timeRange },
        {
          searches: {
            terms: {
              ...getPaginationRequestSizeParams(pageIndex, pageSize),
              field: aggregationFieldName,
              order: sorting
                ? {
                    [sorting.field === ExploreTableColumns.count ? '_count' : '_key']:
                      sorting.direction,
                  }
                : undefined,
            },
            ...getPaginationRequestParams(pageIndex, pageSize),
          },
          ...getTotalCountRequestParams(aggregationFieldName),
        }
      ),
  },
  [ExploreTables.WorsePerformers]: {
    parseResponse: (
      response: IKibanaSearchResponse<{
        aggregations: {
          formula: {
            searches: { buckets: Array<{ doc_count: number; key: string }> };
            totalCount: { value: number };
          };
        };
      }>
    ) => ({
      items: response.rawResponse.aggregations.formula.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.count]: bucket.doc_count,
        [ExploreTableColumns.query]: bucket.key,
      })),
      totalCount: response.rawResponse.aggregations.formula.totalCount.value,
    }),
    requestParams: (
      { timeRange, sorting, pageIndex, pageSize, search },
      aggregationFieldName = 'search.query'
    ) =>
      getBaseSearchTemplate(
        aggregationFieldName,
        { search, timeRange },
        {
          formula: {
            aggs: {
              ...getTotalCountRequestParams(aggregationFieldName),
              searches: {
                terms: {
                  ...getPaginationRequestSizeParams(pageIndex, pageSize),
                  field: aggregationFieldName,
                  order: sorting
                    ? {
                        [sorting?.field === ExploreTableColumns.count ? '_count' : '_key']:
                          sorting?.direction,
                      }
                    : undefined,
                },
                ...getPaginationRequestParams(pageIndex, pageSize),
              },
            },
            filter: { term: { 'search.results.total_results': '0' } },
          },
        }
      ),
  },
  [ExploreTables.TopClicked]: {
    parseResponse: (
      response: IKibanaSearchResponse<{
        aggregations: {
          formula: {
            searches: { buckets: Array<{ doc_count: number; key: string }> };
            totalCount: { value: number };
          };
        };
      }>
    ) => ({
      items: response.rawResponse.aggregations.formula.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.count]: bucket.doc_count,
        [ExploreTableColumns.page]: bucket.key,
      })),
      totalCount: response.rawResponse.aggregations.formula.totalCount.value,
    }),
    requestParams: (
      { timeRange, sorting, pageIndex, pageSize, search },
      aggregationFieldName = 'search.results.items.page.url'
    ) =>
      getBaseSearchTemplate(
        aggregationFieldName,
        { search, timeRange },
        {
          formula: {
            aggs: {
              ...getTotalCountRequestParams(aggregationFieldName),
              searches: {
                terms: {
                  ...getPaginationRequestSizeParams(pageIndex, pageSize),
                  field: aggregationFieldName,
                  order: sorting
                    ? {
                        [sorting.field === ExploreTableColumns.count ? '_count' : '_key']:
                          sorting.direction,
                      }
                    : undefined,
                },
                ...getPaginationRequestParams(pageIndex, pageSize),
              },
            },
            filter: { term: { 'event.action': 'search_click' } },
          },
        }
      ),
  },
  [ExploreTables.TopReferrers]: {
    parseResponse: (
      response: IKibanaSearchResponse<{
        aggregations: {
          formula: {
            searches: { buckets: Array<{ doc_count: number; key: string }> };
            totalCount: { value: number };
          };
        };
      }>
    ) => ({
      items: response.rawResponse.aggregations.formula.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.sessions]: bucket.doc_count,
        [ExploreTableColumns.page]: bucket.key,
      })),
      totalCount: response.rawResponse.aggregations.formula.totalCount.value,
    }),
    requestParams: (
      { timeRange, sorting, pageIndex, pageSize, search },
      aggregationFieldName = 'page.referrer'
    ) =>
      getBaseSearchTemplate(
        aggregationFieldName,
        { search, timeRange },
        {
          formula: {
            aggs: {
              ...getTotalCountRequestParams(aggregationFieldName),
              searches: {
                terms: {
                  ...getPaginationRequestSizeParams(pageIndex, pageSize),
                  field: aggregationFieldName,
                  order: sorting
                    ? {
                        [sorting?.field === ExploreTableColumns.sessions ? '_count' : '_key']:
                          sorting?.direction,
                      }
                    : undefined,
                },
                ...getPaginationRequestParams(pageIndex, pageSize),
              },
            },
            filter: { term: { 'event.action': 'page_view' } },
          },
        }
      ),
  },
};

export interface AnalyticsCollectionExploreTableLogicValues {
  isLoading: boolean;
  items: ExploreTableItem[];
  pageIndex: number;
  pageSize: number;
  search: string;
  selectedTable: ExploreTables | null;
  sorting: Sorting | null;
  totalItemsCount: number;
}

export interface AnalyticsCollectionExploreTableLogicActions {
  onTableChange(state: { page?: { index: number; size: number }; sort?: Sorting }): {
    page?: { index: number; size: number };
    sort?: Sorting;
  };
  reset(): void;
  setItems(items: ExploreTableItem[]): { items: ExploreTableItem[] };
  setSearch(search: string): { search: string };
  setSelectedTable(
    id: ExploreTables | null,
    sorting?: Sorting
  ): { id: ExploreTables | null; sorting?: Sorting };
  setTotalItemsCount(count: number): { count: number };
}

export const AnalyticsCollectionExploreTableLogic = kea<
  MakeLogicType<
    AnalyticsCollectionExploreTableLogicValues,
    AnalyticsCollectionExploreTableLogicActions
  >
>({
  actions: {
    onTableChange: ({ page, sort }) => ({ page, sort }),
    reset: true,
    setItems: (items) => ({ items }),
    setSearch: (search) => ({ search }),
    setSelectedTable: (id, sorting) => ({ id, sorting }),
    setTotalItemsCount: (count) => ({ count }),
  },
  listeners: ({ actions, values }) => {
    const fetchItems = () => {
      if (values.selectedTable === null || !(values.selectedTable in tablesParams)) {
        return;
      }

      const { requestParams, parseResponse } = tablesParams[values.selectedTable] as TableParams;
      const timeRange = AnalyticsCollectionToolbarLogic.values.timeRange;

      const search$ = KibanaLogic.values.data.search
        .search(
          requestParams({
            pageIndex: values.pageIndex,
            pageSize: values.pageSize,
            search: values.search,
            sorting: values.sorting,
            timeRange,
          }),
          {
            indexPattern: AnalyticsCollectionDataViewLogic.values.dataView || undefined,
            sessionId: AnalyticsCollectionToolbarLogic.values.searchSessionId,
          }
        )
        .subscribe({
          error: (e) => {
            KibanaLogic.values.data.search.showError(e);
          },
          next: (response) => {
            if (isCompleteResponse(response)) {
              const { items, totalCount } = parseResponse(response);

              actions.setItems(items);
              actions.setTotalItemsCount(totalCount);
              search$.unsubscribe();
            }
          },
        });
    };

    return {
      onTableChange: fetchItems,
      setSearch: fetchItems,
      setSelectedTable: fetchItems,
      [AnalyticsCollectionToolbarLogic.actionTypes.setTimeRange]: fetchItems,
      [AnalyticsCollectionToolbarLogic.actionTypes.setSearchSessionId]: fetchItems,
    };
  },
  path: ['enterprise_search', 'analytics', 'collections', 'explore', 'table'],
  reducers: () => ({
    isLoading: [
      false,
      {
        onTableChange: () => true,
        setItems: () => false,
        setSearch: () => true,
        setSelectedTable: () => true,
        setTableState: () => true,
        [AnalyticsCollectionToolbarLogic.actionTypes.setTimeRange]: () => true,
        [AnalyticsCollectionToolbarLogic.actionTypes.setSearchSessionId]: () => true,
      },
    ],
    items: [[], { setItems: (_, { items }) => items }],
    pageIndex: [
      0,
      {
        onTableChange: (_, { page }) => page?.index || 0,
        reset: () => 0,
        setSearch: () => 0,
        setSelectedTable: () => 0,
      },
    ],
    pageSize: [
      BASE_PAGE_SIZE,
      {
        onTableChange: (_, { page }) => page?.size || BASE_PAGE_SIZE,
        reset: () => BASE_PAGE_SIZE,
      },
    ],
    search: [
      '',
      { reset: () => '', setSearch: (_, { search }) => search, setSelectedTable: () => '' },
    ],
    selectedTable: [null, { setSelectedTable: (_, { id }) => id }],
    sorting: [
      null,
      {
        onTableChange: (_, { sort = null }) => sort,
        setSelectedTable: (_, { sorting = null }) => sorting,
      },
    ],
    totalItemsCount: [0, { setTotalItemsCount: (_, { count }) => count }],
  }),
});
