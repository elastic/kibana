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
export type {
  DatasourcePublicAPI,
  DataType,
  OperationMetadata,
  SuggestionRequest,
  TableSuggestion,
  Visualization,
  VisualizationSuggestion,
} from './types';
export type {
  AxesSettingsConfig,
  XYLayerConfig,
  LegendConfig,
  SeriesType,
  YAxisMode,
  XYCurveType,
  YConfig,
} from '../common/expressions';
export type {
  ValueLabelConfig,
  PieVisualizationState,
  PieLayerState,
  SharedPieLayerState,
} from '../common/types';

export type { DatatableVisualizationState } from './datatable_visualization/visualization';
export type { HeatmapVisualizationState } from './heatmap_visualization/types';
export type { GaugeVisualizationState } from './visualizations/gauge/constants';
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
  FormulaPublicApi,
  StaticValueIndexPatternColumn,
} from './indexpattern_datasource/types';
export type { LensEmbeddableInput } from './embeddable';
export { layerTypes } from '../common';
export { DimensionEditorSection } from './shared_components/dimension_section';

export type { LensPublicStart, LensPublicSetup } from './plugin';

export const plugin = () => new LensPlugin();
