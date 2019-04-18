/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorChartsComponent } from '../monitor_charts';
import { MonitorChart } from '../../../../common/graphql/types';

describe('MonitorCharts component', () => {
  const chartResponse: { monitorChartsData: MonitorChart } = {
    monitorChartsData: {
      durationArea: [
        { x: 1548697620000, yMin: 106421, yMax: 3120392 },
        { x: 1548697920000, yMin: 121653, yMax: 3955186 },
        { x: 1548698220000, yMin: 118224, yMax: 3705359 },
        { x: 1548698520000, yMin: 123345, yMax: 6669234 },
        { x: 1548698820000, yMin: 117268, yMax: 3955729 },
        { x: 1548699120000, yMin: 122110, yMax: 4045216 },
        { x: 1548699420000, yMin: 120015, yMax: 3682859 },
        { x: 1548699720000, yMin: 114751, yMax: 3701297 },
        { x: 1548700020000, yMin: 111949, yMax: 3632224 },
        { x: 1548700320000, yMin: 105126, yMax: 3801401 },
        { x: 1548700620000, yMin: 123639, yMax: 3925269 },
      ],
      durationLine: [
        { x: 1548697620000, y: 743928.2027027027 },
        { x: 1548697920000, y: 766840.0133333333 },
        { x: 1548698220000, y: 786970.8266666667 },
        { x: 1548698520000, y: 781064.7808219178 },
        { x: 1548698820000, y: 741563.04 },
        { x: 1548699120000, y: 759354.6756756756 },
        { x: 1548699420000, y: 737533.3866666667 },
        { x: 1548699720000, y: 728669.0266666666 },
        { x: 1548700020000, y: 719951.64 },
        { x: 1548700320000, y: 769181.7866666666 },
        { x: 1548700620000, y: 740805.2666666667 },
      ],
      status: [
        { x: 1548697620000, up: 74, down: null, total: 74 },
        { x: 1548697920000, up: 75, down: null, total: 75 },
        { x: 1548698220000, up: 75, down: null, total: 75 },
        { x: 1548698520000, up: 73, down: null, total: 73 },
        { x: 1548698820000, up: 75, down: null, total: 75 },
        { x: 1548699120000, up: 74, down: null, total: 74 },
        { x: 1548699420000, up: 75, down: null, total: 75 },
        { x: 1548699720000, up: 75, down: null, total: 75 },
        { x: 1548700020000, up: 75, down: null, total: 75 },
        { x: 1548700320000, up: 75, down: null, total: 75 },
        { x: 1548700620000, up: 75, down: null, total: 75 },
      ],
      statusMaxCount: 75,
      durationMaxValue: 6669234,
    },
  };

  it('renders the component without errors', () => {
    const component = shallowWithIntl(
      <MonitorChartsComponent
        danger="dangerColor"
        data={{ monitorChartsData: chartResponse.monitorChartsData }}
        loading={false}
        mean="mean"
        range="range"
        success="success"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
