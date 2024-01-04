/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  Chart,
  Tooltip,
  Position,
  ScaleType,
  Settings,
  LEGACY_LIGHT_THEME,
  AreaSeries,
  CurveType,
} from '@elastic/charts';
import React from 'react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import { useStorage } from '@kbn/ml-local-storage';
import { EuiButtonGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { NoChartsData } from './no_charts_data';
import type { Feature } from '../types';
import { COMPARISON_LABEL, DATA_COMPARISON_TYPE, REFERENCE_LABEL } from '../constants';
import { DataComparisonChartTooltipBody } from '../data_drift_chart_tooltip_body';
import { getFieldFormatType, useFieldFormatter } from './default_value_formatter';
import {
  DVKey,
  DVStorageMapped,
  DV_DATA_DRIFT_DISTRIBUTION_CHART_TYPE,
} from '../../index_data_visualizer/types/storage';
import { DATA_DRIFT_COMPARISON_CHART_TYPE } from '../../index_data_visualizer/types/data_drift';
import { useCurrentEuiTheme } from '../../common/hooks/use_current_eui_theme';

const CHART_HEIGHT = 200;

const showAsAreaChartOption = i18n.translate(
  'xpack.dataVisualizer.dataDrift.showAsAreaChartOptionLabel',
  { defaultMessage: 'Show as area chart' }
);

const showAsBarChartOption = i18n.translate(
  'xpack.dataVisualizer.dataDrift.showAsBarChartOptionLabel',
  { defaultMessage: 'Show as bar chart' }
);

const visualizeComparisonChartType = i18n.translate(
  'xpack.dataVisualizer.dataDrift.visualizeComparisonTypeLabel',
  { defaultMessage: 'Visualize comparison type' }
);

const visualizeComparisonChartIcons = [
  {
    id: DATA_DRIFT_COMPARISON_CHART_TYPE.AREA,
    label: showAsAreaChartOption,
    iconType: 'visArea',
  },
  {
    id: DATA_DRIFT_COMPARISON_CHART_TYPE.BAR,
    label: showAsBarChartOption,
    iconType: 'visBarVertical',
  },
];

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
  const euiTheme = useCurrentEuiTheme();

  const xAxisFormatter = useFieldFormatter(getFieldFormatType(secondaryType));
  const yAxisFormatter = useFieldFormatter(FIELD_FORMAT_IDS.NUMBER);
  const [comparisonChartType, setComparisonChartType] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_DATA_DRIFT_DISTRIBUTION_CHART_TYPE>
  >(
    DV_DATA_DRIFT_DISTRIBUTION_CHART_TYPE,
    // By default we will set default comparison chart in expanded row as area chart
    DATA_DRIFT_COMPARISON_CHART_TYPE.AREA
  );

  if (!item || item.comparisonDistribution.length === 0) return <NoChartsData />;
  const { featureName, fieldType, comparisonDistribution: data } = item;

  return (
    <div css={{ width: '100%', height: `calc(${CHART_HEIGHT}px + ${euiTheme.euiSize});` }}>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={visualizeComparisonChartType}
          options={visualizeComparisonChartIcons}
          idSelected={comparisonChartType}
          onChange={(id: string) =>
            setComparisonChartType(
              id as typeof DATA_DRIFT_COMPARISON_CHART_TYPE[keyof typeof DATA_DRIFT_COMPARISON_CHART_TYPE]
            )
          }
          isIconOnly
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <Chart>
        <Tooltip body={DataComparisonChartTooltipBody} />
        <Settings
          // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
          baseTheme={LEGACY_LIGHT_THEME}
          locale={i18n.getLocale()}
        />
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
        {comparisonChartType === DATA_DRIFT_COMPARISON_CHART_TYPE.BAR ? (
          <BarSeries
            id="dataVisualizer.barDistributionComparisonChart"
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
        ) : (
          <AreaSeries
            id="dataVisualizer.overlapDistributionComparisonChart"
            name={i18n.translate('xpack.dataVisualizer.dataDrift.distributionComparisonChartName', {
              defaultMessage:
                'Distribution comparison of {referenceLabel} and {comparisonLabel} data for {fieldName}',
              values: {
                referenceLabel: REFERENCE_LABEL.toLowerCase(),
                comparisonLabel: COMPARISON_LABEL.toLowerCase(),
                fieldName: featureName,
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
        )}
      </Chart>
    </div>
  );
};
