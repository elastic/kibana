/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from './xy_visualization/types';
export type {
  PieVisualizationState,
  PieLayerState,
  SharedPieLayerState,
} from './pie_visualization/types';
export type {
  DatatableVisualizationState,
  DatatableLayerState,
} from './datatable_visualization/visualization';
export type { MetricState } from './metric_visualization/types';
export type {
  IndexPatternPersistedState,
  PersistedIndexPatternLayer,
  IndexPatternColumn,
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
export { LensPublicStart } from './plugin';

export const plugin = () => new LensPlugin();
