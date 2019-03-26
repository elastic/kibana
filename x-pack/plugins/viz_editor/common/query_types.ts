/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ----------------------------------------
// Select clause
// ----------------------------------------

export type OperationName = 'column' | 'count' | 'date_histogram' | 'sum' | 'avg';

export interface Aliasable {
  operation: OperationName;
  alias?: string;
}

export interface GenericOperation extends Aliasable {
  argument: Field;
}

export interface Field {
  field: string;
}

export interface ColumnOperation extends Aliasable {
  operation: 'column';
  argument: Field;
}

export interface DateHistogramOperation extends Aliasable {
  operation: 'date_histogram';
  argument: {
    field: string;
    interval: string;
  };
}

export interface SumOperation extends Aliasable {
  operation: 'sum';
  argument: Field;
}

export interface AvgOperation extends Aliasable {
  operation: 'avg';
  argument: Field;
}

export interface CountOperation extends Aliasable {
  operation: 'count';
}

export type SelectOperation =
  | ColumnOperation
  | DateHistogramOperation
  | SumOperation
  | CountOperation
  | AvgOperation;

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

export interface GenericBoolean {
  operation: BooleanOperator;
  argument: any[];
}

export interface Eq extends GenericBoolean {
  operation: '=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Ne extends GenericBoolean {
  operation: '<>';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Gt extends GenericBoolean {
  operation: '>';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Gte extends GenericBoolean {
  operation: '>=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Lt extends GenericBoolean {
  operation: '<';
  argument: [ComparisonArg, ComparisonArg];
}

export interface Lte extends GenericBoolean {
  operation: '<=';
  argument: [ComparisonArg, ComparisonArg];
}

export interface And extends GenericBoolean {
  operation: 'and';
  argument: BooleanOperation[];
}

export interface Or extends GenericBoolean {
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
  indexPattern: string;

  // What columns / aggregations are we selecting
  select: SelectOperation[];

  // The subset of documents we're querying
  where?: WhereOperation;

  orderBy?: OrderByOperation[];

  // Defaults to 100?
  size?: number;
}
