/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { Filter } from '@kbn/es-query';

type DiscoverPropertiesToPick = 'dataViewId' | 'dataViewSpec' | 'filters';

type DiscoverNavigationParams = Pick<
  DiscoverAppLocatorParams,
  DiscoverPropertiesToPick
>;

const defaultLogsDataViewId = 'logs-*';
const defaultLogsDataView: DataViewSpec = {
  title: defaultLogsDataViewId,
};

const getDefaultDatasetFilter = (dataset: string): Filter[] => [
  {
    meta: {},
    query: {
      match_phrase: {
        'data_stream.dataset': dataset,
      },
    },
  },
];

export const getDiscoverNavigationParams = (
  dataset: string
): DiscoverNavigationParams => ({
  dataViewId: defaultLogsDataViewId,
  dataViewSpec: defaultLogsDataView,
  filters: getDefaultDatasetFilter(dataset),
});
