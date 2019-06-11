/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DimensionPriority } from '../../types';
import {
  IndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  OperationType,
  BaseIndexPatternColumn,
} from '../indexpattern';
import { termsOperation } from './terms';
import { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
import { dateHistogramOperation } from './date_histogram';
import { valueOperation } from './value';
import { countOperation } from './count';

export function getOperations(): OperationType[] {
  return ['value', 'terms', 'date_histogram', 'sum', 'avg', 'min', 'max', 'count'];
}
type PossibleOperationDefinitions<
  U extends IndexPatternColumn = IndexPatternColumn
> = U extends IndexPatternColumn ? OperationDefinition<U> : never;

type PartialOperationDefinitionMap<
  U extends PossibleOperationDefinitions = PossibleOperationDefinitions
> = U extends PossibleOperationDefinitions ? { [K in U['type']]: U } : never;

type UnionToIntersection<U> = (U extends U ? (k: U) => void : never) extends ((k: infer I) => void)
  ? I
  : never;

export type AllOperationDefinitions = UnionToIntersection<PartialOperationDefinitionMap>;

export const operationDefinitionMap: AllOperationDefinitions = {
  terms: termsOperation,
  date_histogram: dateHistogramOperation,
  min: minOperation,
  max: maxOperation,
  avg: averageOperation,
  sum: sumOperation,
  value: valueOperation,
  count: countOperation,
};
const operationDefinitions: PossibleOperationDefinitions[] = Object.values(operationDefinitionMap);

export interface ParamEditorProps {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  columnId: string;
}
export interface OperationDefinition<C extends BaseIndexPatternColumn = BaseIndexPatternColumn> {
  type: C['operationType'];
  displayName: string;
  // TODO make this a function dependend on the indexpattern with typeMeta information
  isApplicableWithoutField: boolean;
  isApplicableForField: (field: IndexPatternField) => boolean;
  buildColumn: (
    operationId: string,
    suggestedOrder?: DimensionPriority,
    field?: IndexPatternField
  ) => C;
  paramEditor?: React.ComponentType<ParamEditorProps>;
  toEsAggsConfig: (column: C, columnId: string) => unknown;
}

export function getOperationDisplay() {
  const display = {} as Record<
    OperationType,
    {
      type: OperationType;
      displayName: string;
    }
  >;
  operationDefinitions.forEach(({ type, displayName }) => {
    display[type] = {
      type,
      displayName,
    };
  });
  return display;
}

export function getOperationTypesForField(field: IndexPatternField): OperationType[] {
  return operationDefinitions
    .filter(definition => definition.isApplicableForField(field))
    .map(({ type }) => type);
}

function buildColumnForOperationType<T extends OperationType>(
  op: T,
  operationId: string,
  suggestedOrder?: DimensionPriority,
  field?: IndexPatternField
): IndexPatternColumn {
  return operationDefinitionMap[op].buildColumn(operationId, suggestedOrder, field);
}

export function getPotentialColumns(
  state: IndexPatternPrivateState,
  suggestedOrder?: DimensionPriority
): IndexPatternColumn[] {
  const fields = state.indexPatterns[state.currentIndexPatternId].fields;

  const columns: IndexPatternColumn[] = fields
    .map((field, index) => {
      const validOperations = getOperationTypesForField(field);

      return validOperations.map(op =>
        buildColumnForOperationType(op, `${op}${index}`, suggestedOrder, field)
      );
    })
    .reduce((prev, current) => prev.concat(current));

  operationDefinitions.forEach(operation => {
    if (operation.isApplicableWithoutField) {
      columns.push(operation.buildColumn(operation.type, suggestedOrder));
    }
  });

  columns.sort((column1, column2) => {
    if ('sourceField' in column1 && 'sourceField' in column2) {
      return column1.sourceField.localeCompare(column2.sourceField);
    }
    return column1.operationType.localeCompare(column2.operationType);
  });

  return columns;
}

export function getColumnOrder(columns: Record<string, IndexPatternColumn>): string[] {
  const entries = Object.entries(columns);

  const [aggregations, metrics] = _.partition(entries, col => col[1].isBucketed);

  return aggregations
    .sort(([id, col], [id2, col2]) => {
      return (
        // Sort undefined orders last
        (col.suggestedOrder !== undefined ? col.suggestedOrder : Number.MAX_SAFE_INTEGER) -
        (col2.suggestedOrder !== undefined ? col2.suggestedOrder : Number.MAX_SAFE_INTEGER)
      );
    })
    .map(([id]) => id)
    .concat(metrics.map(([id]) => id));
}
