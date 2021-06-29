/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTheme } from '../../../../../src/plugins/kibana_react/common';
import {
  getThroughputChartSelector,
  ThroughputChartsResponse,
} from './throughput_chart_selectors';

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
} as ThroughputChartsResponse;

describe('getThroughputChartSelector', () => {
  it('returns default values when data is undefined', () => {
    const throughputTimeseries = getThroughputChartSelector({ theme });
    expect(throughputTimeseries).toEqual({ throughputTimeseries: [] });
  });

  it('returns default values when timeseries is empty', () => {
    const throughputTimeseries = getThroughputChartSelector({
      theme,
      throughputChart: { throughputTimeseries: [] },
    });
    expect(throughputTimeseries).toEqual({ throughputTimeseries: [] });
  });

  it('return throughput time series', () => {
    const throughputTimeseries = getThroughputChartSelector({
      theme,
      throughputChart: throughputData,
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
