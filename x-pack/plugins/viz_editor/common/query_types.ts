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
  | 'terms';

export interface Aliasable {
  operator: SelectOperator;
  alias?: string;
}

export interface Field {
  field: string;
}

export type FieldOperation = Aliasable & {
  argument: Field;
};

export interface ColumnOperation extends FieldOperation {
  operator: 'column';
  argument: Field & {
    size?: number;
  };
}

export interface DateHistogramOperation extends FieldOperation {
  operator: 'date_histogram';
  argument: Field & {
    interval: string;
  };
}

export interface SumOperation extends FieldOperation {
  operator: 'sum';
}

export interface AvgOperation extends FieldOperation {
  operator: 'avg';
}
export interface CardinalityOperation extends FieldOperation {
  operator: 'cardinality';
}

export interface CountOperation extends Aliasable {
  operator: 'count';
}

export interface TermsOperation extends FieldOperation {
  operator: 'terms';
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
  | TermsOperation;

// ----------------------------------------
// Where clause
// ----------------------------------------

export interface LitAtomic {
  operator: 'lit';
  argument: number | string | boolean;
}

export interface LitDate {
  operator: 'date';
  argument: Date | string;
}

type Literal = LitAtomic | LitDate;

type ComparisonArg = Literal | ColumnOperation;

export type BooleanOperator = 'and' | 'or' | '>' | '>=' | '<' | '<=' | '=' | '<>';

export interface Eq {
  operator: '=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Ne {
  operator: '<>';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Gt {
  operator: '>';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Gte {
  operator: '>=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Lt {
  operator: '<';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Lte {
  operator: '<=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface And {
  operator: 'and';
  argument: BooleanOperation[];
}

export interface Or {
  operator: 'or';
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
