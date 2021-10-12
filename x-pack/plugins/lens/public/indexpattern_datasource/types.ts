/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternColumn, IncompleteColumn } from './operations';
import type { IndexPatternAggRestrictions } from '../../../../../src/plugins/data/public';
import type { FieldSpec } from '../../../../../src/plugins/data/common';
import type { DragDropIdentifier } from '../drag_drop/providers';
import type { FieldFormatParams } from '../../../../../src/plugins/field_formats/common';

export {
  FieldBasedIndexPatternColumn,
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
  FormulaIndexPatternColumn,
  MathIndexPatternColumn,
  OverallSumIndexPatternColumn,
} from './operations';

export type DraggedField = DragDropIdentifier & {
  field: IndexPatternField;
  indexPatternId: string;
};
export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  getFieldByName(name: string): IndexPatternField | undefined;
  title: string;
  timeFieldName?: string;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: FieldFormatParams;
    }
  >;
  hasRestrictions: boolean;
}

export type IndexPatternField = FieldSpec & {
  displayName: string;
  aggregationRestrictions?: Partial<IndexPatternAggRestrictions>;
  meta?: boolean;
  runtime?: boolean;
};

export interface IndexPatternLayer {
  columnOrder: string[];
  columns: Record<string, IndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
  // Partial columns represent the temporary invalid states
  incompleteColumns?: Record<string, IncompleteColumn>;
}

export interface IndexPatternPersistedState {
  layers: Record<string, Omit<IndexPatternLayer, 'indexPatternId'>>;
}

export type PersistedIndexPatternLayer = Omit<IndexPatternLayer, 'indexPatternId'>;
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
}
