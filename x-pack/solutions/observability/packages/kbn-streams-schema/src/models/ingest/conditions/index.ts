/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createIsSchema } from '../../../helpers';

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

export type BinaryOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

export type UnaryOperator = 'exists' | 'notExists';

export interface BinaryFilterCondition {
  field: string;
  operator: BinaryOperator;
  value: string | number | boolean;
}

export interface UnaryFilterCondition {
  field: string;
  operator: UnaryOperator;
}

const nonEmptyString = z.string().trim().min(1);

export const binaryFilterConditionSchema: z.Schema<BinaryFilterCondition> = z.strictObject({
  field: nonEmptyString,
  operator: z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith']),
  value: stringOrNumberOrBoolean,
});

export const unaryFilterConditionSchema: z.Schema<UnaryFilterCondition> = z.strictObject({
  field: nonEmptyString,
  operator: z.enum(['exists', 'notExists']),
});

export const filterConditionSchema = z.union([
  unaryFilterConditionSchema,
  binaryFilterConditionSchema,
]);

export type FilterCondition = BinaryFilterCondition | UnaryFilterCondition;

export interface AndCondition {
  and: Condition[];
}

export interface OrCondition {
  or: Condition[];
}

export type Condition = FilterCondition | AndCondition | OrCondition | null;

export const conditionSchema: z.Schema<Condition> = z.lazy(() =>
  z.union([
    filterConditionSchema,
    z.strictObject({ and: z.array(conditionSchema) }),
    z.strictObject({ or: z.array(conditionSchema) }),
  ])
);

export const isBinaryFilterCondition = createIsSchema(binaryFilterConditionSchema);
export const isUnaryFilterCondition = createIsSchema(unaryFilterConditionSchema);
export const isFilterCondition = createIsSchema(filterConditionSchema);

export const isCondition = createIsSchema(conditionSchema);
