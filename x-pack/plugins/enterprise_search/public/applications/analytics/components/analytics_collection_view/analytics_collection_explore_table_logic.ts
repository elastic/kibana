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
import { DataView } from '@kbn/data-views-plugin/common';

import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

import {
  getBaseRequestParams,
  getPaginationRequestParams,
  getPaginationRequestSizeParams,
  getSearchQueryRequestParams,
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
import { FetchAnalyticsCollectionLogic } from './fetch_analytics_collection_logic';

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
    requestParams: ({ timeRange, sorting, pageIndex, pageSize, search }) => ({
      params: {
        aggs: {
          searches: {
            terms: {
              ...getSearchQueryRequestParams(search),
              ...getPaginationRequestSizeParams(pageIndex, pageSize),
              field: 'search.query',
              order: sorting
                ? {
                    [sorting.field === ExploreTableColumns.count ? '_count' : '_key']:
                      sorting.direction,
                  }
                : undefined,
            },
            ...getPaginationRequestParams(pageIndex, pageSize),
          },
          ...getTotalCountRequestParams('search.query'),
        },
        ...getBaseRequestParams(timeRange),
      },
    }),
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
    requestParams: ({ timeRange, sorting, pageIndex, pageSize, search }) => ({
      params: {
        aggs: {
          formula: {
            aggs: {
              ...getTotalCountRequestParams('search.query'),
              searches: {
                terms: {
                  ...getSearchQueryRequestParams(search),
                  ...getPaginationRequestSizeParams(pageIndex, pageSize),
                  field: 'search.query',
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
        },
        ...getBaseRequestParams(timeRange),
      },
    }),
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
    requestParams: ({ timeRange, sorting, pageIndex, pageSize, search }) => ({
      params: {
        aggs: {
          formula: {
            aggs: {
              ...getTotalCountRequestParams('search.results.items.page.url'),
              searches: {
                terms: {
                  ...getSearchQueryRequestParams(search),
                  ...getPaginationRequestSizeParams(pageIndex, pageSize),
                  field: 'search.results.items.page.url',
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
        },
        ...getBaseRequestParams(timeRange),
      },
    }),
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
    requestParams: ({ timeRange, sorting, pageIndex, pageSize, search }) => ({
      params: {
        aggs: {
          formula: {
            aggs: {
              ...getTotalCountRequestParams('page.referrer'),
              searches: {
                terms: {
                  ...getSearchQueryRequestParams(search),
                  ...getPaginationRequestSizeParams(pageIndex, pageSize),
                  field: 'page.referrer',
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
        },
        ...getBaseRequestParams(timeRange),
      },
    }),
  },
};

export interface AnalyticsCollectionExploreTableLogicValues {
  dataView: DataView | null;
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
  reset(): void;
  setDataView(dataView: DataView): { dataView: DataView };
  setItems(items: ExploreTableItem[]): { items: ExploreTableItem[] };
  setPageIndex(index: number): { index: number };
  setPageSize(size: number): { size: number };
  setSearch(search: string): { search: string };
  setSelectedTable(
    id: ExploreTables | null,
    sorting?: Sorting
  ): { id: ExploreTables | null; sorting?: Sorting };
  setSorting(sorting?: Sorting): { sorting?: Sorting };
  setTotalItemsCount(count: number): { count: number };
}

export const AnalyticsCollectionExploreTableLogic = kea<
  MakeLogicType<
    AnalyticsCollectionExploreTableLogicValues,
    AnalyticsCollectionExploreTableLogicActions
  >
>({
  actions: {
    reset: true,
    setDataView: (dataView) => ({ dataView }),
    setItems: (items) => ({ items }),
    setPageIndex: (index) => ({ index }),
    setPageSize: (size) => ({ size }),
    setSearch: (search) => ({ search }),
    setSelectedTable: (id, sorting) => ({ id, sorting }),
    setSorting: (sorting) => ({ sorting }),
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
            indexPattern: values.dataView || undefined,
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
      [FetchAnalyticsCollectionLogic.actionTypes.apiSuccess]: async (collection) => {
        const dataView = (
          await KibanaLogic.values.data.dataViews.find(collection.events_datastream, 1)
        )?.[0];

        if (dataView) {
          actions.setDataView(dataView);
        }
      },
      setPageIndex: fetchItems,
      setPageSize: fetchItems,
      setSearch: fetchItems,
      setSelectedTable: fetchItems,
      setSorting: fetchItems,
      [AnalyticsCollectionToolbarLogic.actionTypes.setTimeRange]: fetchItems,
      [AnalyticsCollectionToolbarLogic.actionTypes.setSearchSessionId]: fetchItems,
    };
  },
  path: ['enterprise_search', 'analytics', 'collections', 'explore', 'table'],
  reducers: () => ({
    dataView: [null, { setDataView: (_, { dataView }) => dataView }],
    isLoading: [
      false,
      {
        setItems: () => false,
        setPageIndex: () => true,
        setPageSize: () => true,
        setSearch: () => true,
        setSelectedTable: () => true,
        setSorting: () => true,
        [AnalyticsCollectionToolbarLogic.actionTypes.setTimeRange]: () => true,
        [AnalyticsCollectionToolbarLogic.actionTypes.setSearchSessionId]: () => true,
      },
    ],
    items: [[], { setItems: (_, { items }) => items }],
    pageIndex: [
      0,
      { reset: () => 0, setPageIndex: (_, { index }) => index, setSelectedTable: () => 0 },
    ],
    pageSize: [BASE_PAGE_SIZE, { reset: () => BASE_PAGE_SIZE, setPageSize: (_, { size }) => size }],
    search: [
      '',
      { reset: () => '', setSearch: (_, { search }) => search, setSelectedTable: () => '' },
    ],
    selectedTable: [null, { setSelectedTable: (_, { id }) => id }],
    sorting: [
      null,
      {
        setSelectedTable: (_, { sorting = null }) => sorting,
        setSorting: (_, { sorting = null }) => sorting,
      },
    ],
    totalItemsCount: [0, { setTotalItemsCount: (_, { count }) => count }],
  }),
});
