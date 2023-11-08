/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, Tooltip, Position, ScaleType, Settings } from '@elastic/charts';
import React from 'react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import { NoChartsData } from './no_charts_data';
import type { Feature } from '../types';
import { COMPARISON_LABEL, DATA_COMPARISON_TYPE } from '../constants';
import { DataComparisonChartTooltipBody } from '../data_drift_chart_tooltip_body';
import { getFieldFormatType, useFieldFormatter } from './default_value_formatter';

const CHART_HEIGHT = 200;

export const DataDriftDistributionChart = ({
  item,
  colors,
  secondaryType,
}: {
  item: Feature | undefined;
  colors: { referenceColor: string; comparisonColor: string };
  secondaryType: string;
  domain?: Feature['domain'];
}) => {
  const xAxisFormatter = useFieldFormatter(getFieldFormatType(secondaryType));
  const yAxisFormatter = useFieldFormatter(FIELD_FORMAT_IDS.NUMBER);

  if (!item || item.comparisonDistribution.length === 0) return <NoChartsData />;
  const { featureName, fieldType, comparisonDistribution: data } = item;

  return (
    <div css={{ width: '100%', height: CHART_HEIGHT }}>
      <Chart>
        <Tooltip body={DataComparisonChartTooltipBody} />
        <Settings locale={i18n.getLocale()} />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={xAxisFormatter}
          labelFormat={xAxisFormatter}
        />
        <Axis
          id="vertical"
          position={Position.Left}
          tickFormat={yAxisFormatter}
          domain={{ min: 0, max: 1 }}
        />
        <BarSeries
          id="data-drift-viz"
          name={featureName}
          xScaleType={
            fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
          }
          yScaleType={ScaleType.Linear}
          xAccessor="key"
          yAccessors={['percentage']}
          splitSeriesAccessors={['g']}
          data={data}
          color={(identifier) => {
            const key = identifier.seriesKeys[0];
            return key === COMPARISON_LABEL ? colors.comparisonColor : colors.referenceColor;
          }}
        />
      </Chart>
    </div>
  );
};
