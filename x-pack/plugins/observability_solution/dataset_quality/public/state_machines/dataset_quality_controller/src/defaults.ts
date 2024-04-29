/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_DATASET_TYPE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
} from '../../../../common/constants';
import { DefaultDatasetQualityControllerState } from './types';

const ONE_MINUTE_IN_MS = 60000;

export const DEFAULT_CONTEXT: DefaultDatasetQualityControllerState = {
  type: DEFAULT_DATASET_TYPE,
  table: {
    page: 0,
    rowsPerPage: 10,
    sort: {
      field: DEFAULT_SORT_FIELD,
      direction: DEFAULT_SORT_DIRECTION,
    },
  },
  filters: {
    inactive: true,
    fullNames: false,
    timeRange: {
      from: 'now-24h',
      to: 'now',
      refresh: {
        pause: true,
        value: ONE_MINUTE_IN_MS,
      },
    },
    integrations: [],
    namespaces: [],
  },
  flyout: {},
  datasets: [],
};
