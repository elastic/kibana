/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ----------------------------------------
// Select clause
// ----------------------------------------

export interface Aliasable {
  alias?: string;
}

export interface Column extends Aliasable {
  operation: 'col';
  argument: string;
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
  argument: string;
}

export interface AvgOperation extends Aliasable {
  operation: 'avg';
  argument: string;
}

export interface CountOperation extends Aliasable {
  operation: 'count';
}

export type SelectOperation =
  | Column
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

type ComparisonArg = Literal | Column;

export interface Eq {
  operation: '=';
  argument: ComparisonArg[];
}

export interface Ne {
  operation: '<>';
  argument: ComparisonArg[];
}

export interface Gt {
  operation: '>';
  argument: ComparisonArg[];
}

export interface Gte {
  operation: '>=';
  argument: ComparisonArg[];
}

export interface Lt {
  operation: '<';
  argument: ComparisonArg[];
}

export interface Lte {
  operation: '<=';
  argument: ComparisonArg[];
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

export interface Query {
  index: string;

  // What columns / aggregations are we selecting
  select: SelectOperation[];

  // The subset of documents we're querying
  where?: WhereOperation;

  // Defaults to 1000?
  size?: number;
}
