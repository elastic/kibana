/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionValueFilter } from '.';

export enum FilterType {
  luceneQueryString = 'luceneQueryString',
  time = 'time',
  exactly = 'exactly',
}

export type CanvasTimeFilter = ExpressionValueFilter & {
  filterType: typeof FilterType.time;
  to: string;
  from: string;
};

export type CanvasLuceneFilter = ExpressionValueFilter & {
  filterType: typeof FilterType.luceneQueryString;
  query: string;
};

export type CanvasExactlyFilter = ExpressionValueFilter & {
  filterType: typeof FilterType.exactly;
  value: string;
  column: string;
};

export type CanvasFilter = CanvasTimeFilter | CanvasExactlyFilter | CanvasLuceneFilter;

export interface Filter {
  type: keyof typeof FilterType;
  column: string;
  value: unknown;
  filterGroup: string;
}

export type ComplexFilterViewField<FilterValue> = (
  value: FilterValue
) => Record<string, SimpleFilterViewField>;

export interface SimpleFilterViewField {
  label: string;
  formatter?: (value: unknown) => string;
}

export interface FormattedFilterViewField {
  label: string;
  formattedValue: string;
}

export type FilterViewInstance<FilterValue = unknown> = Record<
  keyof Filter,
  SimpleFilterViewField | ComplexFilterViewField<FilterValue>
>;

export type FlattenFilterViewInstance = Record<string, SimpleFilterViewField>;
export type FormattedFilterViewInstance = Record<string, FormattedFilterViewField>;

export type FilterField = keyof Filter;
