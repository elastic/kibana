/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ALERTING_API_PATH, INTERNAL_BASE_ALERTING_API_PATH } from '../common';
import type { Rule, RuleType } from '../common';
import { AsApiContract } from '../../actions/common';
import { transformRule, transformRuleType, ApiRule } from './lib/common_transformations';

export async function loadRuleTypes({ http }: { http: HttpSetup }): Promise<RuleType[]> {
  const res = await http.get<Array<AsApiContract<RuleType>>>(
    `${BASE_ALERTING_API_PATH}/rule_types`
  );
  return res.map((ruleType) => transformRuleType(ruleType));
}

export async function loadRuleType({
  http,
  id,
}: {
  http: HttpSetup;
  id: RuleType['id'];
}): Promise<RuleType | undefined> {
  const ruleTypes = await loadRuleTypes({ http });
  return ruleTypes.find((type) => type.id === id);
}

export async function loadRule({
  http,
  ruleId,
}: {
  http: HttpSetup;
  ruleId: string;
}): Promise<Rule> {
  const res = await http.get<ApiRule>(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${ruleId}`);
  return transformRule(res);
}
