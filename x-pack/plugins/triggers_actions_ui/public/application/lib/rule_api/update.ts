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
  'name' | 'tags' | 'schedule' | 'actions' | 'params' | 'throttle' | 'notifyWhen'
>;
const rewriteBodyRequest: RewriteResponseCase<RuleUpdatesBody> = ({
  notifyWhen,
  actions,
  ...res
}): any => ({
  ...res,
  notify_when: notifyWhen,
  actions: actions.map(({ group, id, params }) => ({
    group,
    id,
    params,
  })),
});

export async function updateRule({
  http,
  rule,
  id,
}: {
  http: HttpSetup;
  rule: Pick<
    RuleUpdates,
    'throttle' | 'name' | 'tags' | 'schedule' | 'params' | 'actions' | 'notifyWhen'
  >;
  id: string;
}): Promise<Rule> {
  const res = await http.put<AsApiContract<Rule>>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(
        rewriteBodyRequest(
          pick(rule, ['throttle', 'name', 'tags', 'schedule', 'params', 'actions', 'notifyWhen'])
        )
      ),
    }
  );
  return transformRule(res);
}
