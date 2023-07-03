/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensPlugin } from './plugin';

export type {
  EmbeddableComponentProps,
  TypedLensByValueInput,
} from './embeddable/embeddable_component';
export type { XYState } from './xy_visualization/types';
export type { DataType, OperationMetadata } from './types';
export type {
  PieVisualizationState,
  PieLayerState,
  SharedPieLayerState,
  MetricState,
  AxesSettingsConfig,
  XYLayerConfig,
  LegendConfig,
  SeriesType,
  ValueLabelConfig,
  YAxisMode,
  XYCurveType,
  YConfig,
} from '../common/expressions';
export type { DatatableVisualizationState } from './datatable_visualization/visualization';
export type {
  IndexPatternPersistedState,
  PersistedIndexPatternLayer,
  OperationType,
  IncompleteColumn,
  GenericIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FiltersIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  MinIndexPatternColumn,
  MaxIndexPatternColumn,
  AvgIndexPatternColumn,
  CardinalityIndexPatternColumn,
  SumIndexPatternColumn,
  MedianIndexPatternColumn,
  PercentileIndexPatternColumn,
  CountIndexPatternColumn,
  LastValueIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  CounterRateIndexPatternColumn,
  DerivativeIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  FormulaIndexPatternColumn,
  MathIndexPatternColumn,
  OverallSumIndexPatternColumn,
} from './indexpattern_datasource/types';
export type { LensEmbeddableInput } from './embeddable';

export type { LensPublicStart } from './plugin';

export const plugin = () => new LensPlugin();
