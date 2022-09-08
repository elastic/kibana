/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { listArray, list_id } from '@kbn/securitysolution-io-ts-list-types';

import { rule_id, id, name } from '../common/schemas';

export const ruleReferenceSchema = t.exact(
  t.type({
    name,
    id,
    rule_id,
    exception_lists: listArray,
  })
);

export type RuleReferenceSchema = t.OutputOf<typeof ruleReferenceSchema>;

export const rulesReferencedByExceptionListSchema = t.record(list_id, t.array(ruleReferenceSchema));

export type RuleReferencesSchema = t.OutputOf<typeof rulesReferencedByExceptionListSchema>;

export const rulesReferencedByExceptionListsSchema = t.exact(
  t.type({
    references: t.array(rulesReferencedByExceptionListSchema),
  })
);

export type RulesReferencedByExceptionListsSchema = t.OutputOf<
  typeof rulesReferencedByExceptionListsSchema
>;
