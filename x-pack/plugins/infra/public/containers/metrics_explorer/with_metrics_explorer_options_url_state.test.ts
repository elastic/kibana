/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { mapToUrlState } from './with_metrics_explorer_options_url_state';

describe('WithMetricsExplorerOptionsUrlState', () => {
  describe('mapToUrlState', () => {
    it('loads a valid URL state', () => {
      expect(mapToUrlState(validState)).toEqual(validState);
    });
    it('discards invalid properties and loads valid properties into the URL', () => {
      expect(mapToUrlState(invalidState)).toEqual(omit(invalidState, 'options'));
    });
  });
});

const validState = {
  chartOptions: {
    stack: false,
    type: 'line',
    yAxisMode: 'fromZero',
  },
  options: {
    aggregation: 'avg',
    filterQuery: '',
    groupBy: ['host.hostname'],
    metrics: [
      {
        aggregation: 'avg',
        color: 'color0',
        field: 'system.cpu.user.pct',
      },
      {
        aggregation: 'avg',
        color: 'color1',
        field: 'system.load.1',
      },
    ],
    source: 'url',
  },
  timerange: {
    from: 'now-1h',
    interval: '>=10s',
    to: 'now',
  },
};

const invalidState = {
  chartOptions: {
    stack: false,
    type: 'line',
    yAxisMode: 'fromZero',
  },
  options: {
    aggregation: 'avg',
    filterQuery: '',
    groupBy: ['host.hostname'],
    metrics: 'this is the wrong data type',
    source: 'url',
  },
  timerange: {
    from: 'now-1h',
    interval: '>=10s',
    to: 'now',
  },
};
