/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createModule } from '../util';

// default state and reducer
const defaultState = {
  // general
  checkboxShowChartsVisibility: false,
  loading: true,
  timeFieldName: 'timestamp',

  // anomaly charts
  anomalyChartRecords: [],
  earliestMs: null,
  latestMs: null
};

const actionDefs = {
  ANOMALY_DATA_CHANGE: ({ anomalyChartRecords, earliestMs, latestMs }) => {
    return {
      anomalyChartRecords,
      checkboxShowChartsVisibility: (anomalyChartRecords.length > 0),
      earliestMs,
      latestMs
    };
  },
  TIME_RANGE_CHANGE: (d) => d,
  LOADING_START: () => ({ loading: true }),
  LOADING_STOP: () => ({ loading: false })
};

export const anomalyExplorerModule = createModule({ defaultState, actionDefs });
