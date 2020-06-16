/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import classNames from 'classnames';

import { BarSeries, Chart, Settings } from '@elastic/charts';
import { EuiDataGridColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import './column_chart.scss';

import {
  isNumericChartData,
  isOrdinalChartData,
  useColumnChart,
  ChartData,
} from './use_column_chart';

const getLegendText = (chartData: ChartData, MAX_CHART_COLUMNS: number): string | JSX.Element => {
  if (chartData.type === 'boolean') {
    return (
      <table className="mlDataGridChart__legendBoolean">
        <tbody>
          <tr>
            <td>{chartData.data[0].key_as_string}</td>
            <td>{chartData.data[1].key_as_string}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  if (isOrdinalChartData(chartData) && chartData.cardinality <= MAX_CHART_COLUMNS) {
    return i18n.translate('xpack.ml.dataGridChart.singleCategoryLegend', {
      defaultMessage: `{cardinality, plural, one {# category} other {# categories}}`,
      values: { cardinality: chartData.cardinality },
    });
  }

  if (isOrdinalChartData(chartData) && chartData.cardinality > MAX_CHART_COLUMNS) {
    return i18n.translate('xpack.ml.dataGridChart.topCategoriesLegend', {
      defaultMessage: `top {MAX_CHART_COLUMNS} of {cardinality} categories`,
      values: { cardinality: chartData.cardinality, MAX_CHART_COLUMNS },
    });
  }

  if (isNumericChartData(chartData)) {
    return `${Math.round(chartData.stats[0] * 100) / 100} - ${
      Math.round(chartData.stats[1] * 100) / 100
    }`;
  }

  throw new Error('Invalid chart data.');
};

interface Props {
  chartData: ChartData;
  columnType: EuiDataGridColumn;
}

export const ColumnChart: FC<Props> = ({ chartData, columnType }) => {
  const { coloredData, xScaleType, MAX_CHART_COLUMNS } = useColumnChart(chartData, columnType);

  if (coloredData.length === 0) {
    return <>{columnType.id}</>;
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
        className={classNames('mlDataGridChart__legend', {
          'mlDataGridChart__legend--numeric': isNumericChartData(chartData),
        })}
      >
        {getLegendText(chartData, MAX_CHART_COLUMNS)}
      </div>
      {columnType.id}
    </>
  );
};
