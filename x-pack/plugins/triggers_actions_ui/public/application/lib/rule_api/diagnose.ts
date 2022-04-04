/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { DiagnosticResult } from '../../../../../alerting/common';
import { RewriteResponseCase } from '../../../../../actions/common';
import { Rule } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export type RulePreview = Pick<Rule, 'params' | 'ruleTypeId'>;
const rewriteBodyRequest: RewriteResponseCase<RulePreview> = ({ ruleTypeId, ...res }): any => ({
  ...res,
  rule_type_id: ruleTypeId,
});

export async function diagnoseRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RulePreview;
}): Promise<DiagnosticResult[]> {
  return await http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/_diagnose`, {
    body: JSON.stringify(rewriteBodyRequest(rule)),
  });
}
