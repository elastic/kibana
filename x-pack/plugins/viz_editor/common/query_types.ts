/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ----------------------------------------
// Select clause
// ----------------------------------------

export type SelectOperator =
  | 'column'
  | 'count'
  | 'cardinality'
  | 'date_histogram'
  | 'sum'
  | 'avg'
  | 'terms'
  | 'window';

export interface Aliasable {
  operation: SelectOperator;
  alias?: string;
}

export interface Field {
  field: string;
}

export type FieldOperation = Aliasable & {
  argument: Field;
};

export interface ColumnOperation extends FieldOperation {
  operation: 'column';
  argument: Field & {
    size?: number;
  };
}

export interface DateHistogramOperation extends FieldOperation {
  operation: 'date_histogram';
  argument: Field & {
    interval: string;
  };
}

export interface SumOperation extends FieldOperation {
  operation: 'sum';
}

export interface AvgOperation extends FieldOperation {
  operation: 'avg';
}

export type WindowFunction =
  | 'max'
  | 'min'
  | 'sum'
  | 'stdDev'
  | 'unweightedAvg'
  | 'linearWeightedAvg'
  | 'ewma'
  | 'holt'
  | 'holtWinters';

export interface WindowOperationArgument extends Field {
  windowFunction: WindowFunction;
  windowSize: number;
}

export interface WindowOperation extends FieldOperation {
  operation: 'window';
  argument: WindowOperationArgument;
}

export interface CardinalityOperation extends FieldOperation {
  operation: 'cardinality';
}

export interface CountOperation extends Aliasable {
  operation: 'count';
}

export interface TermsOperation extends FieldOperation {
  operation: 'terms';
  argument: Field & {
    size: number;
  };
}

export type SelectOperation =
  | ColumnOperation
  | DateHistogramOperation
  | SumOperation
  | CountOperation
  | AvgOperation
  | CardinalityOperation
  | TermsOperation
  | WindowOperation;

// ----------------------------------------
// Where clause
// ----------------------------------------

export interface LitAtomic {
  operation: 'lit';
  argument: number | string | boolean;
}

export interface LitDate {
  operation: 'date';
  argument: Date | string;
}

type Literal = LitAtomic | LitDate;

type ComparisonArg = Literal | ColumnOperation;

export type BooleanOperator = 'and' | 'or' | '>' | '>=' | '<' | '<=' | '=' | '<>';

export interface Eq {
  operation: '=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Ne {
  operation: '<>';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Gt {
  operation: '>';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Gte {
  operation: '>=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Lt {
  operation: '<';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Lte {
  operation: '<=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface And {
  operation: 'and';
  argument: BooleanOperation[];
}

export interface Or {
  operation: 'or';
  argument: BooleanOperation[];
}

export type BooleanOperation = And | Or | Gt | Gte | Lt | Lte | Eq | Ne;

export type WhereOperation = And | Or;

export interface OrderByOperation {
  col: string;
  direction: 'asc' | 'desc';
}

export interface Query {
  datasourceRef?: string;

  // What columns / aggregations are we selecting
  select: SelectOperation[];

  // The subset of documents we're querying
  where?: WhereOperation;

  orderBy?: OrderByOperation[];

  // Defaults to 100?
  size?: number;
}
