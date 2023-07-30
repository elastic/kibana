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
import { isSystemAction } from '../is_system_action';

type RuleUpdatesBody = Pick<
  RuleUpdates,
  'name' | 'tags' | 'schedule' | 'actions' | 'params' | 'throttle' | 'notifyWhen'
>;
const rewriteBodyRequest: RewriteResponseCase<RuleUpdatesBody> = ({ actions, ...res }): any => ({
  ...res,
  actions: actions.map((action) => {
    if (isSystemAction(action)) {
      return action;
    }

    const { group, id, params, frequency, uuid, alertsFilter } = action;

    return {
      group,
      id,
      params,
      frequency: {
        notify_when: frequency!.notifyWhen,
        throttle: frequency!.throttle,
        summary: frequency!.summary,
      },
      alerts_filter: alertsFilter,
      ...(uuid && { uuid }),
    };
  }),
});

export async function updateRule({
  http,
  rule,
  id,
}: {
  http: HttpSetup;
  rule: Pick<RuleUpdates, 'name' | 'tags' | 'schedule' | 'params' | 'actions'>;
  id: string;
}): Promise<Rule> {
  const res = await http.put<AsApiContract<Rule>>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(
        rewriteBodyRequest(pick(rule, ['name', 'tags', 'schedule', 'params', 'actions']))
      ),
    }
  );
  return transformRule(res);
}
