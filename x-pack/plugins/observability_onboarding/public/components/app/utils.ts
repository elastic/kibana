/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { Filter, FilterStateStore } from '@kbn/es-query';

type DiscoverPropertiesToPick = 'dataViewId' | 'dataViewSpec' | 'filters';

type DiscoverNavigationParams = Pick<
  DiscoverAppLocatorParams,
  DiscoverPropertiesToPick
>;

const defaultFilterKey = 'data_stream.dataset';
const defaultLogsDataViewId = 'logs-*';
const defaultLogsDataView: DataViewSpec = {
  id: defaultLogsDataViewId,
  title: defaultLogsDataViewId,
};

const getDefaultDatasetFilter = (datasets: string[]): Filter[] => [
  {
    meta: {
      index: defaultLogsDataViewId,
      key: defaultFilterKey,
      params: datasets,
      type: 'phrases',
    },
    query: {
      bool: {
        minimum_should_match: 1,
        should: datasets.map((dataset) => ({
          match_phrase: {
            [defaultFilterKey]: dataset,
          },
        })),
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  },
];

export const getDiscoverNavigationParams = (
  datasets: string[]
): DiscoverNavigationParams => ({
  dataViewId: defaultLogsDataViewId,
  dataViewSpec: defaultLogsDataView,
  filters: getDefaultDatasetFilter(datasets),
});
