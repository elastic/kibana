/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensIconChartArea } from '../assets/chart_area';
import { LensIconChartAreaStacked } from '../assets/chart_area_stacked';
import { LensIconChartAreaPercentage } from '../assets/chart_area_percentage';
import { LensIconChartBar } from '../assets/chart_bar';
import { LensIconChartBarStacked } from '../assets/chart_bar_stacked';
import { LensIconChartBarPercentage } from '../assets/chart_bar_percentage';
import { LensIconChartBarHorizontal } from '../assets/chart_bar_horizontal';
import { LensIconChartBarHorizontalStacked } from '../assets/chart_bar_horizontal_stacked';
import { LensIconChartBarHorizontalPercentage } from '../assets/chart_bar_horizontal_percentage';
import { LensIconChartLine } from '../assets/chart_line';

import type { VisualizationType } from '../types';
import type {
  SeriesType,
  LegendConfig,
  AxisExtentConfig,
  XYLayerConfig,
  XYCurveType,
  AxesSettingsConfig,
  FittingFunction,
  LabelsOrientationConfig,
} from '../../common/expressions';
import type { ValueLabelConfig } from '../../common/types';

// Persisted parts of the state
export interface XYState {
  preferredSeriesType: SeriesType;
  legend: LegendConfig;
  valueLabels?: ValueLabelConfig;
  fittingFunction?: FittingFunction;
  yLeftExtent?: AxisExtentConfig;
  yRightExtent?: AxisExtentConfig;
  layers: XYLayerConfig[];
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  tickLabelsVisibilitySettings?: AxesSettingsConfig;
  gridlinesVisibilitySettings?: AxesSettingsConfig;
  labelsOrientation?: LabelsOrientationConfig;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
}

export type State = XYState;
const groupLabelForBar = i18n.translate('xpack.lens.xyVisualization.barGroupLabel', {
  defaultMessage: 'Bar',
});

const groupLabelForLineAndArea = i18n.translate('xpack.lens.xyVisualization.lineGroupLabel', {
  defaultMessage: 'Line and area',
});

export const visualizationTypes: VisualizationType[] = [
  {
    id: 'bar',
    icon: LensIconChartBar,
    label: i18n.translate('xpack.lens.xyVisualization.barLabel', {
      defaultMessage: 'Bar vertical',
    }),
    groupLabel: groupLabelForBar,
    sortPriority: 4,
  },
  {
    id: 'bar_horizontal',
    icon: LensIconChartBarHorizontal,
    label: i18n.translate('xpack.lens.xyVisualization.barHorizontalLabel', {
      defaultMessage: 'H. Bar',
    }),
    fullLabel: i18n.translate('xpack.lens.xyVisualization.barHorizontalFullLabel', {
      defaultMessage: 'Bar horizontal',
    }),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'bar_stacked',
    icon: LensIconChartBarStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarLabel', {
      defaultMessage: 'Bar vertical stacked',
    }),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'bar_percentage_stacked',
    icon: LensIconChartBarPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarLabel', {
      defaultMessage: 'Bar vertical percentage',
    }),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'bar_horizontal_stacked',
    icon: LensIconChartBarHorizontalStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalLabel', {
      defaultMessage: 'H. Stacked bar',
    }),
    fullLabel: i18n.translate('xpack.lens.xyVisualization.stackedBarHorizontalFullLabel', {
      defaultMessage: 'Bar horizontal stacked',
    }),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'bar_horizontal_percentage_stacked',
    icon: LensIconChartBarHorizontalPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarHorizontalLabel', {
      defaultMessage: 'H. Percentage bar',
    }),
    fullLabel: i18n.translate(
      'xpack.lens.xyVisualization.stackedPercentageBarHorizontalFullLabel',
      {
        defaultMessage: 'Bar horizontal percentage',
      }
    ),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'area',
    icon: LensIconChartArea,
    label: i18n.translate('xpack.lens.xyVisualization.areaLabel', {
      defaultMessage: 'Area',
    }),
    groupLabel: groupLabelForLineAndArea,
  },
  {
    id: 'area_stacked',
    icon: LensIconChartAreaStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedAreaLabel', {
      defaultMessage: 'Area stacked',
    }),
    groupLabel: groupLabelForLineAndArea,
  },
  {
    id: 'area_percentage_stacked',
    icon: LensIconChartAreaPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageAreaLabel', {
      defaultMessage: 'Area percentage',
    }),
    groupLabel: groupLabelForLineAndArea,
  },
  {
    id: 'line',
    icon: LensIconChartLine,
    label: i18n.translate('xpack.lens.xyVisualization.lineLabel', {
      defaultMessage: 'Line',
    }),
    groupLabel: groupLabelForLineAndArea,
    sortPriority: 2,
  },
];
