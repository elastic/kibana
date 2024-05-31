/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LEGACY_LIGHT_THEME,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { NoChartsData } from './no_charts_data';
import type { ComparisonHistogram, DataDriftField } from '../types';
import { DataComparisonChartTooltipBody } from '../data_drift_chart_tooltip_body';
import { COMPARISON_LABEL, DATA_COMPARISON_TYPE, REFERENCE_LABEL } from '../constants';
import { getFieldFormatType, useFieldFormatter } from './default_value_formatter';

export const OverlapDistributionComparison = ({
  data,
  colors,
  fieldType,
  fieldName,
  secondaryType,
}: {
  data: ComparisonHistogram[];
  colors: { referenceColor: string; comparisonColor: string };
  secondaryType: string;
  fieldType?: DataDriftField['type'];
  fieldName?: DataDriftField['field'];
}) => {
  const xAxisFormatter = useFieldFormatter(getFieldFormatType(secondaryType));
  const yAxisFormatter = useFieldFormatter(FIELD_FORMAT_IDS.NUMBER);
  if (data.length === 0) return <NoChartsData textAlign="left" />;

  return (
    <Chart>
      <Tooltip body={DataComparisonChartTooltipBody} />
      <Axis
        id="vertical"
        position={Position.Left}
        tickFormat={yAxisFormatter}
        domain={{ min: 0, max: 1 }}
        hide={true}
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        tickFormat={xAxisFormatter}
        labelFormat={xAxisFormatter}
        hide={true}
      />

      <Settings
        // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
        baseTheme={LEGACY_LIGHT_THEME}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      <AreaSeries
        id="dataVisualizer.overlapDistributionComparisonChart"
        name={i18n.translate('xpack.dataVisualizer.dataDrift.distributionComparisonChartName', {
          defaultMessage:
            'Distribution comparison of {referenceLabel} and {comparisonLabel} data for {fieldName}',
          values: {
            referenceLabel: REFERENCE_LABEL.toLowerCase(),
            comparisonLabel: COMPARISON_LABEL.toLowerCase(),
            fieldName,
          },
        })}
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
          return key === COMPARISON_LABEL ? colors.comparisonColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};
