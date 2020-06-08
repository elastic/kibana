/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { BarSeries, Chart, Settings } from '@elastic/charts';
import { EuiDataGridColumn } from '@elastic/eui';

import './column_chart.scss';

import {
  isNumericChartData,
  isOrdinalChartData,
  useColumnChart,
  ChartData,
} from './use_column_chart';

export const mlDataGridChartClassName = 'mlDataGridChart';

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
}

export const ColumnChart: FC<Props> = ({ chartData, columnType }) => {
  const { coloredData, xScaleType, MAX_CHART_COLUMNS } = useColumnChart(chartData, columnType);

  if (coloredData.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mlDataGridChart__histogram">
        <Chart>
          <Settings
            theme={{
              chartMargins: {
                left: 4,
                right: 4,
                top: 5,
                bottom: 1,
              },
              chartPaddings: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              },
              scales: { barsPadding: 0.1 },
            }}
          />
          <BarSeries
            id="histogram"
            name="count"
            xScaleType={xScaleType}
            yScaleType="linear"
            xAccessor="key"
            yAccessors={['doc_count']}
            styleAccessor={(d) => d.datum.color}
            data={coloredData}
          />
        </Chart>
      </div>
      <div
        className={`mlDataGridChart__legend${
          isNumericChartData(chartData) ? ' mlDataGridChart__legend--numeric' : ''
        }`}
      >
        {isOrdinalChartData(chartData) &&
          chartData.cardinality === 1 &&
          `${chartData.cardinality} category`}
        {isOrdinalChartData(chartData) &&
          chartData.cardinality > MAX_CHART_COLUMNS &&
          `top ${MAX_CHART_COLUMNS} of ${chartData.cardinality} categories`}
        {isOrdinalChartData(chartData) &&
          chartData.cardinality <= MAX_CHART_COLUMNS &&
          chartData.cardinality > 1 &&
          `${chartData.cardinality} categories`}
        {isNumericChartData(chartData) &&
          `${Math.round(chartData.stats[0] * 100) / 100} - ${
            Math.round(chartData.stats[1] * 100) / 100
          }`}
      </div>
    </>
  );
};
