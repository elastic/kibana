/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { exceptionListSchema, listArray, list_id } from '@kbn/securitysolution-io-ts-list-types';

import { RuleName, RuleObjectId, RuleSignatureId } from '../../rule_schema';

export const ruleReferenceRuleInfoSchema = t.exact(
  t.type({
    name: RuleName,
    id: RuleObjectId,
    rule_id: RuleSignatureId,
    exception_lists: listArray,
  })
);

export type ExceptionListRuleReferencesInfoSchema = t.OutputOf<typeof ruleReferenceRuleInfoSchema>;

export const exceptionListRuleReferencesSchema = t.intersection([
  exceptionListSchema,
  t.exact(
    t.type({
      referenced_rules: t.array(ruleReferenceRuleInfoSchema),
    })
  ),
]);

export type ExceptionListRuleReferencesSchema = t.OutputOf<
  typeof exceptionListRuleReferencesSchema
>;

export const rulesReferencedByExceptionListSchema = t.record(
  list_id,
  exceptionListRuleReferencesSchema
);

export type RuleReferencesSchema = t.OutputOf<typeof rulesReferencedByExceptionListSchema>;

export const rulesReferencedByExceptionListsSchema = t.exact(
  t.type({
    references: t.array(rulesReferencedByExceptionListSchema),
  })
);

export type RulesReferencedByExceptionListsSchema = t.OutputOf<
  typeof rulesReferencedByExceptionListsSchema
>;
