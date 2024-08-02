/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
  DEFAULT_DEGRADED_FIELD_SORT_FIELD,
} from '../../../common/constants';
import { DefaultDatasetQualityDetailsContext } from './types';

const ONE_MINUTE_IN_MS = 60 * 1000;

export const DEFAULT_CONTEXT: DefaultDatasetQualityDetailsContext = {
  degradedFields: {
    table: {
      page: 0,
      rowsPerPage: 10,
      sort: {
        field: DEFAULT_DEGRADED_FIELD_SORT_FIELD,
        direction: DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
      },
    },
  },
  timeRange: {
    from: 'now-24h',
    to: 'now',
    refresh: {
      pause: true,
      value: ONE_MINUTE_IN_MS,
    },
  },
};
