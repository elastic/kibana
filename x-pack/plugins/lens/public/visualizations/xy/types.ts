/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { $Values } from '@kbn/utility-types';
import type { ColorMapping, PaletteOutput } from '@kbn/coloring';
import type {
  LegendConfig,
  AxisExtentConfig,
  XYCurveType,
  FittingFunction,
  EndValue,
  YScaleType,
  XScaleType,
  LineStyle,
  IconPosition,
  FillStyle,
  YAxisConfig,
} from '@kbn/expression-xy-plugin/common';
import { EventAnnotationConfig, EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import {
  IconChartArea,
  IconChartLine,
  IconChartAreaStacked,
  IconChartBarHorizontalStacked,
  IconChartBarHorizontalPercentage,
  IconChartAreaPercentage,
  IconChartBar,
  IconChartBarStacked,
  IconChartBarPercentage,
  IconChartBarHorizontal,
} from '@kbn/chart-icons';

import { CollapseFunction } from '../../../common/expressions';
import type { VisualizationType } from '../../types';
import type { ValueLabelConfig } from '../../../common/types';

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const;

export const SeriesTypes = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  BAR_STACKED: 'bar_stacked',
  AREA_STACKED: 'area_stacked',
  BAR_HORIZONTAL: 'bar_horizontal',
  BAR_PERCENTAGE_STACKED: 'bar_percentage_stacked',
  BAR_HORIZONTAL_STACKED: 'bar_horizontal_stacked',
  AREA_PERCENTAGE_STACKED: 'area_percentage_stacked',
  BAR_HORIZONTAL_PERCENTAGE_STACKED: 'bar_horizontal_percentage_stacked',
} as const;

export type YAxisMode = $Values<typeof YAxisModes>;
export type SeriesType = $Values<typeof SeriesTypes>;
export interface AxesSettingsConfig {
  x: boolean;
  yRight: boolean;
  yLeft: boolean;
}

export interface AxisConfig extends Omit<YAxisConfig, 'extent'> {
  extent?: AxisExtentConfig;
}

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

export interface YConfig {
  forAccessor: string;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: Exclude<LineStyle, 'dot-dashed'>;
  fill?: FillStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
  axisMode?: YAxisMode;
}

export interface XYDataLayerConfig {
  layerId: string;
  accessors: string[];
  layerType: 'data';
  seriesType: SeriesType;
  xAccessor?: string;
  simpleView?: boolean;
  yConfig?: YConfig[];
  splitAccessor?: string;
  palette?: PaletteOutput;
  collapseFn?: CollapseFunction;
  xScaleType?: XScaleType;
  isHistogram?: boolean;
  columnToLabel?: string;
  colorMapping?: ColorMapping.Config;
}

export interface XYReferenceLineLayerConfig {
  layerId: string;
  accessors: string[];
  yConfig?: YConfig[];
  layerType: 'referenceLine';
}

export interface XYByValueAnnotationLayerConfig {
  layerId: string;
  layerType: 'annotations';
  annotations: EventAnnotationConfig[];
  indexPatternId: string;
  ignoreGlobalFilters: boolean;
  // populated only when the annotation has been forked from the
  // version saved in the library (persisted as XYPersistedLinkedByValueAnnotationLayerConfig)
  cachedMetadata?: {
    title: string;
    description: string;
    tags: string[];
  };
}

export type XYPersistedByValueAnnotationLayerConfig = Omit<
  XYByValueAnnotationLayerConfig,
  'indexPatternId' | 'hide' | 'simpleView'
> & { persistanceType?: 'byValue'; hide?: boolean; simpleView?: boolean }; // props made optional for backwards compatibility since this is how the existing saved objects are

export type XYByReferenceAnnotationLayerConfig = XYByValueAnnotationLayerConfig & {
  annotationGroupId: string;
  __lastSaved: EventAnnotationGroupConfig;
};

export type XYPersistedByReferenceAnnotationLayerConfig = Pick<
  XYByValueAnnotationLayerConfig,
  'layerId' | 'layerType'
> & {
  persistanceType: 'byReference';
  annotationGroupRef: string;
};

/**
 * This is the type of hybrid layer we get after the user has made a change to
 * a by-reference annotation layer and saved the visualization without
 * first saving the changes to the library annotation layer.
 *
 * We maintain the link to the library annotation group, but allow the users
 * changes (persisted in the visualization state) to override the attributes in
 * the library version until the user
 * - saves the changes to the library annotation group
 * - reverts the changes
 * - unlinks the layer from the library annotation group
 */
export type XYPersistedLinkedByValueAnnotationLayerConfig = Omit<
  XYPersistedByValueAnnotationLayerConfig,
  'persistanceType'
> &
  Omit<XYPersistedByReferenceAnnotationLayerConfig, 'persistanceType'> & {
    persistanceType: 'linked';
  };

export type XYAnnotationLayerConfig =
  | XYByReferenceAnnotationLayerConfig
  | XYByValueAnnotationLayerConfig;

export type XYPersistedAnnotationLayerConfig =
  | XYPersistedByReferenceAnnotationLayerConfig
  | XYPersistedByValueAnnotationLayerConfig
  | XYPersistedLinkedByValueAnnotationLayerConfig;

export type XYPersistedLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYPersistedAnnotationLayerConfig;

export type XYLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYAnnotationLayerConfig;

export interface ValidXYDataLayerConfig extends XYDataLayerConfig {
  xAccessor: NonNullable<XYDataLayerConfig['xAccessor']>;
  layerId: string;
}

export type ValidLayer = ValidXYDataLayerConfig | XYReferenceLineLayerConfig;

// Persisted parts of the state
export interface XYState {
  preferredSeriesType: SeriesType;
  legend: LegendConfig;
  valueLabels?: ValueLabelConfig;
  fittingFunction?: FittingFunction;
  emphasizeFitting?: boolean;
  endValue?: EndValue;
  xExtent?: AxisExtentConfig;
  yLeftExtent?: AxisExtentConfig;
  yRightExtent?: AxisExtentConfig;
  layers: XYLayerConfig[];
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  yLeftScale?: YScaleType;
  yRightScale?: YScaleType;
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  tickLabelsVisibilitySettings?: AxesSettingsConfig;
  gridlinesVisibilitySettings?: AxesSettingsConfig;
  labelsOrientation?: LabelsOrientationConfig;
  curveType?: XYCurveType;
  fillOpacity?: number;
  minBarHeight?: number;
  hideEndzones?: boolean;
  showCurrentTimeMarker?: boolean;
  valuesInLegend?: boolean;
}

export type State = XYState;

export type XYPersistedState = Omit<XYState, 'layers'> & {
  layers: XYPersistedLayerConfig[];
};

export type PersistedState = XYPersistedState;

const groupLabelForBar = i18n.translate('xpack.lens.xyVisualization.barGroupLabel', {
  defaultMessage: 'Bar',
});

const groupLabelForLineAndArea = i18n.translate('xpack.lens.xyVisualization.lineGroupLabel', {
  defaultMessage: 'Line and area',
});

export const visualizationTypes: VisualizationType[] = [
  {
    id: 'bar',
    icon: IconChartBar,
    label: i18n.translate('xpack.lens.xyVisualization.barLabel', {
      defaultMessage: 'Bar vertical',
    }),
    groupLabel: groupLabelForBar,
    sortPriority: 4,
  },
  {
    id: 'bar_horizontal',
    icon: IconChartBarHorizontal,
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
    icon: IconChartBarStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarLabel', {
      defaultMessage: 'Bar vertical stacked',
    }),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'bar_percentage_stacked',
    icon: IconChartBarPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageBarLabel', {
      defaultMessage: 'Bar vertical percentage',
    }),
    groupLabel: groupLabelForBar,
  },
  {
    id: 'bar_horizontal_stacked',
    icon: IconChartBarHorizontalStacked,
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
    icon: IconChartBarHorizontalPercentage,
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
    icon: IconChartArea,
    label: i18n.translate('xpack.lens.xyVisualization.areaLabel', {
      defaultMessage: 'Area',
    }),
    groupLabel: groupLabelForLineAndArea,
  },
  {
    id: 'area_stacked',
    icon: IconChartAreaStacked,
    label: i18n.translate('xpack.lens.xyVisualization.stackedAreaLabel', {
      defaultMessage: 'Area stacked',
    }),
    groupLabel: groupLabelForLineAndArea,
  },
  {
    id: 'area_percentage_stacked',
    icon: IconChartAreaPercentage,
    label: i18n.translate('xpack.lens.xyVisualization.stackedPercentageAreaLabel', {
      defaultMessage: 'Area percentage',
    }),
    groupLabel: groupLabelForLineAndArea,
  },
  {
    id: 'line',
    icon: IconChartLine,
    label: i18n.translate('xpack.lens.xyVisualization.lineLabel', {
      defaultMessage: 'Line',
    }),
    groupLabel: groupLabelForLineAndArea,
    sortPriority: 2,
  },
];
