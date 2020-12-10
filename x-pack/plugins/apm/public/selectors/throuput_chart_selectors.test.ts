/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTheme } from '../../../observability/public';
import {
  getThrouputChartSelector,
  ThrouputChartsResponse,
} from './throuput_chart_selectors';

const theme = {
  eui: {
    euiColorVis1: 'green',
    euiColorVis2: 'black',
    euiColorVis3: 'gray',
    euiColorVis4: 'blue',
    euiColorVis6: 'red',
    euiColorVis8: 'yellow',
    euiColorSecondary: 'white',
    euiColorDanger: 'purple',
  },
} as EuiTheme;

const throughputData = {
  throughputTimeseries: [
    { key: 'HTTP 2xx', avg: 1, dataPoints: [{ x: 1, y: 2 }] },
    { key: 'HTTP 4xx', avg: 1, dataPoints: [{ x: 1, y: 2 }] },
    { key: 'HTTP 5xx', avg: 1, dataPoints: [{ x: 1, y: 2 }] },
  ],
} as ThrouputChartsResponse;

describe('getThrouputChartSelector', () => {
  it('returns default values when data is undefined', () => {
    const throughputTimeseries = getThrouputChartSelector({ theme });
    expect(throughputTimeseries).toEqual({ throughputTimeseries: [] });
  });

  it('return throughput time series', () => {
    const throughputTimeseries = getThrouputChartSelector({
      theme,
      throuputChart: throughputData,
    });

    expect(throughputTimeseries).toEqual({
      throughputTimeseries: [
        {
          title: 'HTTP 2xx',
          data: [{ x: 1, y: 2 }],
          legendValue: '1.0 tpm',
          type: 'linemark',
          color: '#327a42',
        },
        {
          title: 'HTTP 4xx',
          data: [{ x: 1, y: 2 }],
          legendValue: '1.0 tpm',
          type: 'linemark',
          color: '#f5a700',
        },
        {
          title: 'HTTP 5xx',
          data: [{ x: 1, y: 2 }],
          legendValue: '1.0 tpm',
          type: 'linemark',
          color: '#c23c2b',
        },
      ],
    });
  });
});
