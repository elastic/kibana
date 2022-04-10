/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { DiagnoseOutput } from '../../../../../alerting/common';
import { RewriteResponseCase } from '../../../../../actions/common';
import { Rule } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export type PartialRule = Partial<Rule>;
const rewriteBodyRequest: RewriteResponseCase<PartialRule> = ({ ruleTypeId, ...res }): any => ({
  ...res,
  rule_type_id: ruleTypeId,
});

export async function diagnoseRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: PartialRule;
}): Promise<DiagnoseOutput> {
  if (rule.id) {
    return await http.get(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${rule.id}/_diagnose`);
  } else {
    return await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/_preview`, {
      body: JSON.stringify(rewriteBodyRequest(rule)),
    });
  }
}

export async function bulkDiagnoseRules({
  http,
  ids,
}: {
  http: HttpSetup;
  ids: string[];
}): Promise<DiagnoseOutput[]> {
  return await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/_bulk_diagnose`, {
    body: JSON.stringify({ ids }),
  });
}
