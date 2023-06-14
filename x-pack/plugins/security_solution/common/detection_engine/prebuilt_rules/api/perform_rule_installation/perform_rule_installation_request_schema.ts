/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const RuleVersionSpecifier = t.exact(
  t.type({
    rule_id: t.string,
    version: t.number,
  })
);
export type RuleVersionSpecifier = t.TypeOf<typeof RuleVersionSpecifier>;

export const InstallSpecificRulesRequest = t.exact(
  t.type({
    mode: t.literal(`SPECIFIC_RULES`),
    rules: t.array(RuleVersionSpecifier),
  })
);

export const InstallAllRulesRequest = t.exact(
  t.type({
    mode: t.literal(`ALL_RULES`),
  })
);

export const PerformRuleInstallationRequestBody = t.union([
  InstallAllRulesRequest,
  InstallSpecificRulesRequest,
]);

export type PerformRuleInstallationRequestBody = t.TypeOf<
  typeof PerformRuleInstallationRequestBody
>;
