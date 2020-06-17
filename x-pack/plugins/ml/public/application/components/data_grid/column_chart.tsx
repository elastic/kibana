/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import classNames from 'classnames';

import { BarSeries, Chart, Settings } from '@elastic/charts';
import { EuiDataGridColumn } from '@elastic/eui';

import './column_chart.scss';

import {
  isNumericChartData,
  isUnsupportedChartData,
  useColumnChart,
  ChartData,
} from './use_column_chart';

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
}

export const ColumnChart: FC<Props> = ({ chartData, columnType }) => {
  const { data, legendText, xScaleType } = useColumnChart(chartData, columnType);

  return (
    <>
      {!isUnsupportedChartData(chartData) && data.length > 0 && (
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
              data={data}
            />
          </Chart>
        </div>
      )}
      <div
        className={classNames('mlDataGridChart__legend', {
          'mlDataGridChart__legend--numeric': isNumericChartData(chartData),
        })}
      >
        {legendText}
      </div>
      {columnType.id}
    </>
  );
};
