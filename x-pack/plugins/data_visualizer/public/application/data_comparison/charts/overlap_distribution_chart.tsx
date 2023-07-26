/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Chart, CurveType, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NoChartsData } from './no_charts_data';
import type { ComparisonHistogram, DataComparisonField } from '../types';
import { DataComparisonChartTooltipBody } from '../data_comparison_chart_tooltip_body';
import { COMPARISON_LABEL, DATA_COMPARISON_TYPE, REFERENCE_LABEL } from '../constants';

export const OverlapDistributionComparison = ({
  data,
  colors,
  fieldType,
  fieldName,
}: {
  data: ComparisonHistogram[];
  colors: { referenceColor: string; productionColor: string };
  fieldType?: DataComparisonField['type'];
  fieldName?: DataComparisonField['field'];
}) => {
  if (data.length === 0) return <NoChartsData textAlign="left" />;

  return (
    <Chart>
      <Tooltip body={DataComparisonChartTooltipBody} />

      <Settings showLegend={false} />
      <AreaSeries
        id="dataVisualizer.overlapDistributionComparisonChart"
        name={i18n.translate(
          'xpack.dataVisualizer.dataComparison.distributionComparisonChartName',
          {
            defaultMessage:
              'Distribution comparison of {referenceLabel} and {comparisonLabel} data for {fieldName}',
            values: {
              referenceLabel: REFERENCE_LABEL.toLowerCase(),
              comparisonLabel: COMPARISON_LABEL.toLowerCase(),
              fieldName,
            },
          }
        )}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        splitSeriesAccessors={['g']}
        data={data}
        curve={CurveType.CURVE_STEP}
        color={(identifier) => {
          const key = identifier.seriesKeys[0];
          return key === COMPARISON_LABEL ? colors.productionColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};
