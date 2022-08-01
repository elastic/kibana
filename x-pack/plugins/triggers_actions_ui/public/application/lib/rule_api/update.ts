/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { pick } from 'lodash';
import { RewriteResponseCase, AsApiContract } from '@kbn/actions-plugin/common';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { Rule, RuleUpdates } from '../../../types';
import { transformRule } from './common_transformations';

type RuleUpdatesBody = Pick<
  RuleUpdates,
  'name' | 'tags' | 'schedule' | 'actions' | 'params' | 'throttle'
>;
const rewriteBodyRequest: RewriteResponseCase<RuleUpdatesBody> = ({ actions, ...res }): any => ({
  ...res,
  actions: actions.map(
    ({
      group,
      id,
      params,
      isSummary,
      notifyWhen,
      summaryOf,
      actionThrottle,
      actionThrottleUnit,
      lastTriggerDate,
    }) => ({
      group,
      id,
      params,
      is_summary: isSummary,
      notify_when: notifyWhen,
      summary_of: summaryOf,
      action_throttle: actionThrottle,
      action_throttle_unit: actionThrottleUnit,
      last_trigger_date: lastTriggerDate,
    })
  ),
});

export async function updateRule({
  http,
  rule,
  id,
}: {
  http: HttpSetup;
  rule: Pick<RuleUpdates, 'throttle' | 'name' | 'tags' | 'schedule' | 'params' | 'actions'>;
  id: string;
}): Promise<Rule> {
  const res = await http.put<AsApiContract<Rule>>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(
        rewriteBodyRequest(
          pick(rule, ['throttle', 'name', 'tags', 'schedule', 'params', 'actions'])
        )
      ),
    }
  );
  return transformRule(res);
}
