/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, FilterMeta } from '@kbn/es-query';
import type { Position } from '@elastic/charts';
import type { $Values } from '@kbn/utility-types';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ColorMode } from '@kbn/charts-plugin/common';
import type { LegendSize } from '@kbn/visualizations-plugin/common';
import {
  CategoryDisplay,
  layerTypes,
  LegendDisplay,
  NumberDisplay,
  PieChartTypes,
} from './constants';

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export interface ExistingFields {
  indexPatternTitle: string;
  existingFieldNames: string[];
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface PersistableFilterMeta extends FilterMeta {
  indexRefName?: string;
}

export interface PersistableFilter extends Filter {
  meta: PersistableFilterMeta;
}

export type SortingHint = 'version';

export type CustomPaletteParamsConfig = CustomPaletteParams & {
  maxSteps?: number;
};

export type LayerType = typeof layerTypes[keyof typeof layerTypes];

export type ValueLabelConfig = 'hide' | 'show';

export type PieChartType = $Values<typeof PieChartTypes>;
export type CategoryDisplayType = $Values<typeof CategoryDisplay>;
export type NumberDisplayType = $Values<typeof NumberDisplay>;

export type LegendDisplayType = $Values<typeof LegendDisplay>;

export enum EmptySizeRatios {
  SMALL = 0.3,
  MEDIUM = 0.54,
  LARGE = 0.7,
}

export interface SharedPieLayerState {
  primaryGroups: string[];
  secondaryGroups?: string[];
  metric?: string;
  collapseFns?: Record<string, string>;
  numberDisplay: NumberDisplayType;
  categoryDisplay: CategoryDisplayType;
  legendDisplay: LegendDisplayType;
  legendPosition?: Position;
  showValuesInLegend?: boolean;
  nestedLegend?: boolean;
  percentDecimals?: number;
  emptySizeRatio?: number;
  legendMaxLines?: number;
  legendSize?: LegendSize;
  truncateLegend?: boolean;
}

export type PieLayerState = SharedPieLayerState & {
  layerId: string;
  layerType: LayerType;
};

export interface PieVisualizationState {
  shape: $Values<typeof PieChartTypes>;
  layers: PieLayerState[];
  palette?: PaletteOutput;
}
export interface LegacyMetricState {
  layerId: string;
  accessor?: string;
  layerType: LayerType;
  colorMode?: ColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  titlePosition?: 'top' | 'bottom';
  size?: string;
  textAlign?: 'left' | 'right' | 'center';
}
