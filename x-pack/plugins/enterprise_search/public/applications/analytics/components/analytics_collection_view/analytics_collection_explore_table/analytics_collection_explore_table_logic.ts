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

import { AnalyticsCollection } from '../../../../../../common/types/analytics';
import { KibanaLogic } from '../../../../shared/kibana/kibana_logic';
import { AnalyticsCollectionToolbarLogic } from '../analytics_collection_toolbar/analytics_collection_toolbar_logic';

import {
  ExploreTableColumns,
  ExploreTableItem,
  ExploreTables,
  SearchTermsTable,
  TopClickedTable,
  TopReferrersTable,
  WorsePerformersTable,
} from './analytics_collection_explore_table_types';

const BASE_PAGE_SIZE = 10;

export interface Sorting<T extends ExploreTableItem = ExploreTableItem> {
  direction: 'asc' | 'desc';
  field: keyof T;
}

interface TableParams<T extends ExploreTableItem = ExploreTableItem> {
  parseResponseToItems(response: IKibanaSearchResponse): T[];
  requestParams(timeRange: TimeRange, sorting: Sorting<T> | null): IKibanaSearchRequest;
}

const tablesParams: {
  [ExploreTables.SearchTerms]: TableParams<SearchTermsTable>;
  [ExploreTables.TopClicked]: TableParams<TopClickedTable>;
  [ExploreTables.TopReferrers]: TableParams<TopReferrersTable>;
  [ExploreTables.WorsePerformers]: TableParams<WorsePerformersTable>;
} = {
  [ExploreTables.SearchTerms]: {
    parseResponseToItems: (
      response: IKibanaSearchResponse<{
        aggregations: { searches: { buckets: Array<{ doc_count: number; key: string }> } };
      }>
    ) =>
      response.rawResponse.aggregations.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.count]: bucket.doc_count,
        [ExploreTableColumns.searchTerms]: bucket.key,
      })),
    requestParams: (timeRange, sorting) => ({
      params: {
        aggs: {
          searches: {
            terms: {
              field: 'search.query',
              order: sorting
                ? {
                    [sorting.field === ExploreTableColumns.count ? '_count' : '_key']:
                      sorting.direction,
                  }
                : undefined,
              size: BASE_PAGE_SIZE,
            },
          },
        },
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lt: timeRange.to,
            },
          },
        },
        size: 0,
        track_total_hits: false,
      },
    }),
  },
  [ExploreTables.WorsePerformers]: {
    parseResponseToItems: (
      response: IKibanaSearchResponse<{
        aggregations: {
          formula: { searches: { buckets: Array<{ doc_count: number; key: string }> } };
        };
      }>
    ) =>
      response.rawResponse.aggregations.formula.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.count]: bucket.doc_count,
        [ExploreTableColumns.query]: bucket.key,
      })),
    requestParams: (timeRange, sorting) => ({
      params: {
        aggs: {
          formula: {
            aggs: {
              searches: {
                terms: {
                  field: 'search.query',
                  order: sorting
                    ? {
                        [sorting?.field === ExploreTableColumns.count ? '_count' : '_key']:
                          sorting?.direction,
                      }
                    : undefined,
                  size: BASE_PAGE_SIZE,
                },
              },
            },
            filter: { term: { 'search.results.total_results': '0' } },
          },
        },
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lt: timeRange.to,
            },
          },
        },
        size: 0,
        track_total_hits: false,
      },
    }),
  },
  [ExploreTables.TopClicked]: {
    parseResponseToItems: (
      response: IKibanaSearchResponse<{
        aggregations: {
          formula: { searches: { buckets: Array<{ doc_count: number; key: string }> } };
        };
      }>
    ) =>
      response.rawResponse.aggregations.formula.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.count]: bucket.doc_count,
        [ExploreTableColumns.page]: bucket.key,
      })),
    requestParams: (timeRange, sorting) => ({
      params: {
        aggs: {
          formula: {
            aggs: {
              searches: {
                terms: {
                  field: 'search.results.items.page.url',
                  order: sorting
                    ? {
                        [sorting.field === ExploreTableColumns.count ? '_count' : '_key']:
                          sorting.direction,
                      }
                    : undefined,
                  size: BASE_PAGE_SIZE,
                },
              },
            },
            filter: { term: { 'event.action': 'search_click' } },
          },
        },
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lt: timeRange.to,
            },
          },
        },
        size: 0,
        track_total_hits: false,
      },
    }),
  },
  [ExploreTables.TopReferrers]: {
    parseResponseToItems: (
      response: IKibanaSearchResponse<{
        aggregations: {
          formula: { searches: { buckets: Array<{ doc_count: number; key: string }> } };
        };
      }>
    ) =>
      response.rawResponse.aggregations.formula.searches.buckets.map((bucket) => ({
        [ExploreTableColumns.sessions]: bucket.doc_count,
        [ExploreTableColumns.page]: bucket.key,
      })),
    requestParams: (timeRange, sorting) => ({
      params: {
        aggs: {
          formula: {
            aggs: {
              searches: {
                terms: {
                  field: 'page.referrer',
                  order: sorting
                    ? {
                        [sorting?.field === ExploreTableColumns.sessions ? '_count' : '_key']:
                          sorting?.direction,
                      }
                    : undefined,
                  size: BASE_PAGE_SIZE,
                },
              },
            },
            filter: { term: { 'event.action': 'page_view' } },
          },
        },
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lt: timeRange.to,
            },
          },
        },
        size: 0,
        track_total_hits: false,
      },
    }),
  },
};

export interface AnalyticsCollectionExploreTableLogicValues {
  dataView: DataView | null;
  isLoading: boolean;
  items: ExploreTableItem[];
  selectedTable: ExploreTables | null;
  sorting: Sorting | null;
}

export interface AnalyticsCollectionExploreTableLogicActions {
  setDataView(dataView: DataView): { dataView: DataView };
  setItems(items: ExploreTableItem[]): { items: ExploreTableItem[] };
  setSelectedTable(
    id: ExploreTables | null,
    sorting?: Sorting
  ): { id: ExploreTables | null; sorting?: Sorting };
  setSorting(sorting?: Sorting): { sorting?: Sorting };
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
    setSelectedTable: (id, sorting) => ({ id, sorting }),
    setSorting: (sorting) => ({ sorting }),
  },
  listeners: ({ actions, values }) => {
    const fetchItems = () => {
      if (values.selectedTable === null || !(values.selectedTable in tablesParams)) {
        return;
      }

      const { requestParams, parseResponseToItems } = tablesParams[
        values.selectedTable
      ] as TableParams;
      const timeRange = AnalyticsCollectionToolbarLogic.values.timeRange;

      const search$ = KibanaLogic.values.data.search
        .search(requestParams(timeRange, values.sorting), {
          indexPattern: values.dataView || undefined,
          sessionId: AnalyticsCollectionToolbarLogic.values.searchSessionId,
        })
        .subscribe({
          error: (e) => {
            KibanaLogic.values.data.search.showError(e);
          },
          next: (response) => {
            if (isCompleteResponse(response)) {
              actions.setItems(parseResponseToItems(response));
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
      setSelectedTable: () => {
        fetchItems();
      },
      [AnalyticsCollectionToolbarLogic.actionTypes.setTimeRange]: () => {
        fetchItems();
      },
      [AnalyticsCollectionToolbarLogic.actionTypes.setSearchSessionId]: () => {
        fetchItems();
      },
    };
  },
  path: ['enterprise_search', 'analytics', 'collections', 'explore', 'table'],
  reducers: () => ({
    dataView: [null, { setDataView: (_, { dataView }) => dataView }],
    isLoading: [
      false,
      {
        setItems: () => false,
        setSelectedTable: () => true,
        [AnalyticsCollectionToolbarLogic.actionTypes.setTimeRange]: () => true,
        [AnalyticsCollectionToolbarLogic.actionTypes.setSearchSessionId]: () => true,
      },
    ],
    items: [[], { setItems: (_, { items }) => items }],
    selectedTable: [null, { setSelectedTable: (_, { id }) => id }],
    sorting: [
      null,
      {
        setSelectedTable: (_, { sorting = null }) => sorting,
        setSorting: (_, { sorting = null }) => sorting,
      },
    ],
  }),
});
