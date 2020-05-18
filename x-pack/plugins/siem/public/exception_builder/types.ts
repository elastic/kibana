/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export interface OperatorOption {
  message: string;
  value: string;
  operator: Operator;
  type: OperatorType;
}

export enum Operator {
  INCLUSION = 'included',
  EXCLUSION = 'excluded',
}

export enum OperatorType {
  PHRASE = 'match',
  PHRASES = 'match_any',
  EXISTS = 'exists',
  LIST = 'list',
}

export const ExceptionOperatorSchema = t.keyof({ included: null, excluded: null });
export type ExceptionOperator = t.TypeOf<typeof ExceptionOperatorSchema>;

export const ExceptionItemEntrySchema = t.exact(
  t.intersection([
    t.type({
      field: t.string,
      operator: ExceptionOperatorSchema,
    }),
    t.partial({
      match: t.string,
      match_any: t.array(t.string),
      list: t.string,
    }),
  ])
);
export type ExceptionItemEntry = t.TypeOf<typeof ExceptionItemEntrySchema>;

export const ExceptionItemSchema = t.exact(
  t.intersection([
    t.type({
      id: t.union([t.string, t.null]),
      item_id: t.string,
      list_id: t.string,
      type: t.string,
      name: t.string,
      entries: t.array(ExceptionItemEntrySchema),
    }),
    t.partial({
      tie_breaker_id: t.string,
      updated_at: t.string,
      updated_by: t.string,
      created_at: t.string,
      created_by: t.string,
      description: t.string,
      comment: t.string,
      _tags: t.array(t.string),
    }),
  ])
);
export type ExceptionItem = t.TypeOf<typeof ExceptionItemSchema>;

export const NewExceptionItem = t.exact(
  t.intersection([
    t.type({
      list_id: t.string,
      type: t.string,
      entries: t.array(ExceptionItemEntrySchema),
    }),
    t.partial({
      id: t.string,
      name: t.string,
      item_id: t.string,
      tie_breaker_id: t.string,
      updated_at: t.string,
      updated_by: t.string,
      created_at: t.string,
      created_by: t.string,
      description: t.string,
      comment: t.string,
      tags: t.array(t.string),
      _tags: t.array(t.string),
    }),
  ])
);
export type NewExceptionItem = t.TypeOf<typeof NewExceptionItem>;

export const ExceptionListSchema = t.exact(
  t.intersection([
    t.type({
      id: t.string,
      list_id: t.string,
      type: t.string,
      name: t.string,
      exceptions: t.array(ExceptionItemSchema),
    }),
    t.partial({
      description: t.string,
      comment: t.string,
      _tags: t.array(t.string),
      created_at: t.string,
      created_by: t.string,
      tie_breaker_id: t.string,
      updated_at: t.string,
      updated_by: t.string,
    }),
  ])
);
export type ExceptionList = t.TypeOf<typeof ExceptionListSchema>;

export interface AddExceptionListProps {
  list: ExceptionList;
  signal: AbortSignal;
}

export interface AddExceptionListItemProps {
  listItem: ExceptionItem;
  signal: AbortSignal;
}

export interface FetchExceptionListProps {
  id: string;
  signal: AbortSignal;
}
