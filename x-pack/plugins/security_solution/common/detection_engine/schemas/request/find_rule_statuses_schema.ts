/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const findRulesStatusesSchema = t.exact(
  t.type({
    ids: t.array(t.string),
  })
);

export type FindRulesStatusesSchema = t.TypeOf<typeof findRulesStatusesSchema>;

export type FindRulesStatusesSchemaDecoded = FindRulesStatusesSchema;

export const findRuleStatusSchema = t.exact(
  t.type({
    ruleId: t.string,
  })
);

export type FindRuleStatusSchema = t.TypeOf<typeof findRuleStatusSchema>;

export type FindRuleStatusSchemaDecoded = FindRuleStatusSchema;
