/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteResponseCase } from '@kbn/actions-plugin/common';
import { RuleConfigurationExplanation } from '@kbn/alerting-plugin/common/rule';
import { Rule, RuleUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';

type RuleExplainBody = Omit<
  RuleUpdates,
  'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
>;

const rewriteBodyRequest: RewriteResponseCase<RuleExplainBody> = ({
  ruleTypeId,
  notifyWhen,
  actions,
  ...res
}): any => ({
  ...res,
  rule_type_id: ruleTypeId,
  notify_when: notifyWhen,
  actions: actions.map(({ group, id, params }) => ({
    group,
    id,
    params,
  })),
});

export async function explainRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: RuleExplainBody;
}): Promise<RuleConfigurationExplanation> {
  const res = await http.post<AsApiContract<RuleConfigurationExplanation>>(
    `${BASE_ALERTING_API_PATH}/explain_rule`,
    {
      body: JSON.stringify(rewriteBodyRequest(rule)),
    }
  );
  return res;
}
