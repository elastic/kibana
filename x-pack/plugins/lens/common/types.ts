/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, FilterMeta } from '@kbn/es-query';
import type { Position } from '@elastic/charts';
import type { $Values } from '@kbn/utility-types';
import { CustomPaletteParams, PaletteOutput, ColorMapping } from '@kbn/coloring';
import type { ColorMode } from '@kbn/charts-plugin/common';
import type { LegendSize } from '@kbn/visualizations-plugin/common';
import { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/common';
import { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { VisualizeEditorContext } from '../public/types';
import { CollapseFunction } from './expressions';
import { layerTypes } from './layer_types';
import { CategoryDisplay, LegendDisplay, NumberDisplay, PieChartTypes } from './constants';

export type { OriginalColumn } from './expressions/map_to_columns';
export type { AllowedPartitionOverrides } from '@kbn/expression-partition-vis-plugin/common';
export type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
export type { AllowedGaugeOverrides } from '@kbn/expression-gauge-plugin/common';
export type { AllowedXYOverrides } from '@kbn/expression-xy-plugin/common';
export type { FormatFactory } from '@kbn/visualization-ui-components';

export interface DateRange {
  fromDate: string;
  toDate: string;
}

interface PersistableFilterMeta extends FilterMeta {
  indexRefName?: string;
}

export interface PersistableFilter extends Filter {
  meta: PersistableFilterMeta;
}

export type SortingHint = string;

export type LayerType = typeof layerTypes[keyof typeof layerTypes];

export type ValueLabelConfig = 'hide' | 'show';

export type PieChartType = $Values<typeof PieChartTypes>;
type CategoryDisplayType = $Values<typeof CategoryDisplay>;
type NumberDisplayType = $Values<typeof NumberDisplay>;

type LegendDisplayType = $Values<typeof LegendDisplay>;

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
  colorMapping?: ColorMapping.Config;
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

export interface IndexPatternRef {
  id: string;
  title: string;
  name?: string;
}

export type IndexPatternField = FieldSpec & {
  displayName: string;
  aggregationRestrictions?: Partial<IndexPatternAggRestrictions>;
  /**
   * Map of fields which can be used, but may fail partially (ranked lower than others)
   */
  partiallyApplicableFunctions?: Partial<Record<string, boolean>>;
  timeSeriesMetric?: 'histogram' | 'summary' | 'gauge' | 'counter' | 'position';
  timeSeriesRollup?: boolean;
  meta?: boolean;
  runtime?: boolean;
};

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  getFieldByName(name: string): IndexPatternField | undefined;
  title: string;
  name?: string;
  timeFieldName?: string;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: FieldFormatParams;
    }
  >;
  hasRestrictions: boolean;
  spec: DataViewSpec;
  isPersisted: boolean;
}

export type IndexPatternMap = Record<string, IndexPattern>;

/**
 * A subset of datasource methods used on both client and server
 */
export interface DatasourceCommon<T = unknown, P = unknown> {
  // For initializing, either from an empty state or from persisted state
  // Because this will be called at runtime, state might have a type of `any` and
  // datasources should validate their arguments
  initialize: (
    state?: P,
    savedObjectReferences?: SavedObjectReference[],
    initialContext?: VisualizeFieldContext | VisualizeEditorContext,
    indexPatternRefs?: IndexPatternRef[],
    indexPatterns?: IndexPatternMap
  ) => T;

  getLayers: (state: T) => string[];

  toExpression: (
    state: T,
    layerId: string,
    indexPatterns: IndexPatternMap,
    dateRange: DateRange,
    nowInstant: Date,
    searchSessionId?: string
  ) => ExpressionAstExpression | string | null;
}
