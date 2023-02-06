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
import { CategoryDisplay, LegendDisplay, NumberDisplay, PieChartTypes } from './constants';
import { layerTypes } from './layer_types';
import { CollapseFunction } from './expressions';

export type { OriginalColumn } from './expressions/map_to_columns';

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

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
  metrics: string[];
  primaryGroups: string[];
  secondaryGroups?: string[];
  allowMultipleMetrics?: boolean;
  colorsByDimension?: Record<string, string>;
  collapseFns?: Record<string, CollapseFunction>;
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
  autoScaleMetricAlignment?: 'left' | 'right' | 'center';
  layerId: string;
  accessor?: string;
  layerType: LayerType;
  colorMode?: ColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  titlePosition?: 'top' | 'bottom';
  size?: string;
  textAlign?: 'left' | 'right' | 'center';
}
