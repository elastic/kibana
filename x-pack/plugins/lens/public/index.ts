/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LensPlugin } from './plugin';

export type {
  AxesSettingsConfig,
  LegendConfig,
  MetricState,
  PieLayerState,
  PieVisualizationState,
  SeriesType,
  SharedPieLayerState,
  ValueLabelConfig,
  XYCurveType,
  XYLayerConfig,
  YAxisMode,
  YConfig,
} from '../common/expressions';
export type { DatatableVisualizationState } from './datatable_visualization/visualization';
export type { LensEmbeddableInput } from './embeddable';
export type {
  EmbeddableComponentProps,
  TypedLensByValueInput,
} from './embeddable/embeddable_component';
export type {
  AvgIndexPatternColumn,
  CardinalityIndexPatternColumn,
  CounterRateIndexPatternColumn,
  CountIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  DerivativeIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FiltersIndexPatternColumn,
  FormulaIndexPatternColumn,
  IncompleteColumn,
  IndexPatternColumn,
  IndexPatternPersistedState,
  LastValueIndexPatternColumn,
  MathIndexPatternColumn,
  MaxIndexPatternColumn,
  MedianIndexPatternColumn,
  MinIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  OperationType,
  OverallSumIndexPatternColumn,
  PercentileIndexPatternColumn,
  PersistedIndexPatternLayer,
  RangeIndexPatternColumn,
  SumIndexPatternColumn,
  TermsIndexPatternColumn,
} from './indexpattern_datasource/types';
export { LensPublicStart } from './plugin';
export type { DataType, OperationMetadata } from './types';
export type { XYState } from './xy_visualization/types';

export const plugin = () => new LensPlugin();
