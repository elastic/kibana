/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { DataViewSpec, FieldSpec } from '@kbn/data-plugin/common';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import type { DragDropIdentifier } from '../drag_drop/providers';
import type { IncompleteColumn, GenericIndexPatternColumn } from './operations';
import { DragDropOperation } from '../types';

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
  spec?: DataViewSpec;
}

export type IndexPatternField = FieldSpec & {
  displayName: string;
  aggregationRestrictions?: Partial<IndexPatternAggRestrictions>;
  meta?: boolean;
  runtime?: boolean;
};

export interface IndexPatternLayer {
  columnOrder: string[];
  columns: Record<string, GenericIndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
  // Partial columns represent the temporary invalid states
  incompleteColumns?: Record<string, IncompleteColumn>;
}

export interface IndexPatternPersistedState {
  layers: Record<string, Omit<IndexPatternLayer, 'indexPatternId'> & { adHocDataViewId?: string }>;
  adHocIndexPatterns?: Record<string, DataViewSpec>;
}

export type PersistedIndexPatternLayer = Omit<IndexPatternLayer, 'indexPatternId'> & {
  adHocDataViewId?: string;
};

export interface IndexPatternPrivateState {
  currentIndexPatternId: string;
  layers: Record<string, IndexPatternLayer>;
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;

  /**
   * indexPatternId -> fieldName -> boolean
   */
  existingFields: Record<string, Record<string, boolean>>;
  isFirstExistenceFetch: boolean;
  existenceFetchFailed?: boolean;
  existenceFetchTimeout?: boolean;

  isDimensionClosePrevented?: boolean;
}

export interface IndexPatternRef {
  id: string;
  title: string;
  name?: string;
  adHoc?: boolean;
}

export interface DataViewDragDropOperation extends DragDropOperation {
  dataView: IndexPattern;
  column?: GenericIndexPatternColumn;
}
