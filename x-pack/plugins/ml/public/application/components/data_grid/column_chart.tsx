/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { BarSeries, Chart, Settings } from '@elastic/charts';
import { EuiText } from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

import './column_chart.scss';

import { useColumnChart } from './use_column_chart';

export const mlDataGridChartClassName = 'mlDataGridChart';

interface Props {
  indexPatternTitle: string;
  columnType: any;
  query: any;
  api: any;
}

export const ColumnChart: FC<Props> = ({ indexPatternTitle, columnType, query, api }) => {
  const {
    cardinality,
    coloredData,
    fieldType,
    stats,
    xScaleType,
    MAX_CHART_COLUMNS,
  } = useColumnChart(indexPatternTitle, columnType, query, api);

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
      <div className="mlDataGridChart__legend">
        <EuiText
          size="xs"
          color="subdued"
          style={{
            marginLeft: '4px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <i>
            {(fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) &&
              cardinality === 1 &&
              `${cardinality} category`}
            {(fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) &&
              cardinality > MAX_CHART_COLUMNS &&
              `top ${MAX_CHART_COLUMNS} of ${cardinality} categories`}
            {(fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) &&
              cardinality <= MAX_CHART_COLUMNS &&
              cardinality > 1 &&
              `${cardinality} categories`}
            {(fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) &&
              `${Math.round(stats[0] * 100) / 100} - ${Math.round(stats[1] * 100) / 100}`}
          </i>
        </EuiText>
      </div>
    </>
  );
};
