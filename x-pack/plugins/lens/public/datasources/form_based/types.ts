/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { GenericIndexPatternColumn } from './operations';
import type { IndexPattern, IndexPatternField, DragDropOperation } from '../../types';

export type {
  GenericIndexPatternColumn,
  OperationType,
  IncompleteColumn,
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
  StandardDeviationIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  CountIndexPatternColumn,
  LastValueIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  CounterRateIndexPatternColumn,
  DerivativeIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  FormulaIndexPatternColumn,
  MathIndexPatternColumn,
  OverallSumIndexPatternColumn,
  StaticValueIndexPatternColumn,
  TimeScaleIndexPatternColumn,
} from './operations';

export type { FormulaPublicApi } from './operations/definitions/formula/formula_public_api';

export type DraggedField = DragDropIdentifier & {
  field: IndexPatternField;
  indexPatternId: string;
};

export type PersistedIndexPatternLayer = Omit<FormBasedLayer, 'indexPatternId'>;

export interface FormBasedPrivateState {
  currentIndexPatternId: string;
  layers: Record<string, FormBasedLayer>;
}

export interface DataViewDragDropOperation extends DragDropOperation {
  dataView: IndexPattern;
  column?: GenericIndexPatternColumn;
}
