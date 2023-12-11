/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  exceptionListSchema,
  listArray,
  list_id,
  DefaultNamespaceArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyStringArray } from '@kbn/securitysolution-io-ts-types';
// TODO https://github.com/elastic/security-team/issues/7491
// eslint-disable-next-line no-restricted-imports
import { RuleName, RuleObjectId, RuleSignatureId } from '../../model/rule_schema_legacy';

// If ids and list_ids are undefined, route will fetch all lists matching the
// specified namespace type
export const findExceptionReferencesOnRuleSchema = t.intersection([
  t.exact(
    t.type({
      namespace_types: DefaultNamespaceArray,
    })
  ),
  t.exact(
    t.partial({
      ids: NonEmptyStringArray,
      list_ids: NonEmptyStringArray,
    })
  ),
]);

export type FindExceptionReferencesOnRuleSchema = t.OutputOf<
  typeof findExceptionReferencesOnRuleSchema
>;

export type FindExceptionReferencesOnRuleSchemaDecoded = t.TypeOf<
  typeof findExceptionReferencesOnRuleSchema
>;

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
