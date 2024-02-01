/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '../../../../common/constants';
import { DefaultDatasetQualityControllerState } from './types';

export const DEFAULT_CONTEXT: DefaultDatasetQualityControllerState = {
  table: {
    page: 0,
    rowsPerPage: 10,
    sort: {
      field: DEFAULT_SORT_FIELD,
      direction: DEFAULT_SORT_DIRECTION,
    },
  },
  flyout: {},
  datasets: [],
};
