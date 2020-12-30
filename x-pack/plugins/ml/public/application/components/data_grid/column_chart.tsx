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

import { isUnsupportedChartData, useColumnChart, ChartData } from './use_column_chart';

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
  dataTestSubj: string;
  hideLabel?: boolean;
  maxChartColumns?: number;
}

const columnChartTheme = {
  background: { color: 'transparent' },
  chartMargins: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 1,
  },
  chartPaddings: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scales: { barsPadding: 0.1 },
};
export const ColumnChart: FC<Props> = ({
  chartData,
  columnType,
  dataTestSubj,
  hideLabel,
  maxChartColumns,
}) => {
  const { data, legendText, xScaleType } = useColumnChart(chartData, columnType, maxChartColumns);

  return (
    <div data-test-subj={dataTestSubj}>
      {!isUnsupportedChartData(chartData) && data.length > 0 && (
        <div className="mlDataGridChart__histogram" data-test-subj={`${dataTestSubj}-histogram`}>
          <Chart>
            <Settings theme={columnChartTheme} />
            <BarSeries
              id="histogram"
              name="count"
              xScaleType={xScaleType}
              yScaleType="linear"
              xAccessor={'key_as_string'}
              yAccessors={['doc_count']}
              styleAccessor={(d) => d.datum.color}
              data={data}
            />
          </Chart>
        </div>
      )}
      <div
        className={classNames('mlDataGridChart__legend', {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'mlDataGridChart__legend--numeric': columnType.schema === 'number',
        })}
        data-test-subj={`${dataTestSubj}-legend`}
      >
        {legendText}
      </div>
      {!hideLabel && <div data-test-subj={`${dataTestSubj}-id`}>{columnType.id}</div>}
    </div>
  );
};
