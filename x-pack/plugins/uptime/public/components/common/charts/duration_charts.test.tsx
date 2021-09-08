/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import DateMath from '@elastic/datemath';
import { DurationChartComponent } from './duration_chart';
import { MonitorDurationResult } from '../../../../common/types';
import { render } from '../../../lib/helper/rtl_helpers';

describe('MonitorCharts component', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const chartResponse: { monitorChartsData: MonitorDurationResult } = {
    monitorChartsData: {
      locationDurationLines: [
        {
          name: 'somewhere',
          line: [
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
        },
      ],
    },
  };

  it('renders the component without errors', () => {
    const { getByLabelText } = render(
      <DurationChartComponent
        loading={false}
        anomalies={null}
        locationDurationLines={chartResponse.monitorChartsData.locationDurationLines}
      />,
      {
        state: {
          monitorStatus: {
            loading: false,
            status: {
              docId: 'docId',
              timestamp: '123',
              monitor: {
                duration: { us: 123 },
                id: 'mon-id',
                status: 'up',
                type: 'tcp',
              },
            },
          },
        },
      }
    );
    expect(getByLabelText(`A chart displaying the monitor's ping duration, grouped by location.`));
  });

  it('renders an empty state when no monitor data is present', () => {
    const { getByText } = render(
      <DurationChartComponent loading={false} anomalies={null} locationDurationLines={[]} />
    );
    expect(getByText('No duration data available'));
  });
});
