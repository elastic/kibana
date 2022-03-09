/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import classNames from 'classnames';

import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiDataGridColumn } from '@elastic/eui';

import './column_chart.scss';

import { isUnsupportedChartData, ChartData } from './field_histograms';

import { useColumnChart } from './use_column_chart';

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
  dataTestSubj: string;
  hideLabel?: boolean;
  maxChartColumns: number;
  isNumeric?: boolean;
}

const zeroSize = { bottom: 0, left: 0, right: 0, top: 0 };
const size = { width: 100, height: 10 };

export const ColumnChart: FC<Props> = ({
  chartData,
  columnType,
  dataTestSubj,
  hideLabel,
  maxChartColumns,
  isNumeric,
}) => {
  const { data, legendText } = useColumnChart(chartData, columnType, maxChartColumns, isNumeric);

  return (
    <div data-test-subj={dataTestSubj} style={{ width: '100%' }}>
      {!isUnsupportedChartData(chartData) && data.length > 0 && (
        <Chart size={size}>
          <Settings
            xDomain={Array.from({ length: maxChartColumns }, (_, i) => i)}
            theme={{
              chartMargins: zeroSize,
              chartPaddings: zeroSize,
              crosshair: { band: { visible: false } },
            }}
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            tickFormat={(idx) => {
              return `${data[idx]?.key_as_string ?? ''}`;
            }}
            hide
          />
          <BarSeries
            id={'count'}
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['doc_count']}
            data={data}
            styleAccessor={(d) => d.datum.color}
          />
        </Chart>
      )}
      <div
        className={classNames('dataGridChart__legend', {
          'dataGridChart__legend--numeric': columnType.schema === 'number',
        })}
        data-test-subj={`${dataTestSubj}-legend`}
      >
        {legendText}
      </div>
      {!hideLabel && <div data-test-subj={`${dataTestSubj}-id`}>{columnType.id}</div>}
    </div>
  );
};
