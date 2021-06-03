/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensPlugin } from './plugin';

export {
  EmbeddableComponentProps,
  TypedLensByValueInput,
} from './editor_frame_service/embeddable/embeddable_component';
export type {
  XYState,
  AxesSettingsConfig,
  XYLayerConfig,
  LegendConfig,
  SeriesType,
  ValueLabelConfig,
  YAxisMode,
  XYCurveType,
  YConfig,
} from './xy_visualization/types';
export type { DataType, OperationMetadata } from './types';
export type {
  PieVisualizationState,
  PieLayerState,
  SharedPieLayerState,
} from './pie_visualization/types';
export type { DatatableVisualizationState } from './datatable_visualization/visualization';
export type { MetricState } from './metric_visualization/types';
export type {
  IndexPatternPersistedState,
  PersistedIndexPatternLayer,
  IndexPatternColumn,
  FieldBasedIndexPatternColumn,
  OperationType,
  IncompleteColumn,
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
} from './indexpattern_datasource/types';
export type { LensEmbeddableInput } from './editor_frame_service/embeddable';

export { LensPublicStart } from './plugin';

export const plugin = () => new LensPlugin();
