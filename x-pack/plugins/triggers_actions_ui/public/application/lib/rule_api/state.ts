/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { Errors, identity } from 'io-ts';
import { ruleStateSchema } from '@kbn/alerting-plugin/common';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { RuleTaskState } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RuleTaskState> = ({
  rule_type_state: alertTypeState,
  alerts: alertInstances,
  previous_started_at: previousStartedAt,
  ...rest
}: any) => ({
  ...rest,
  alertTypeState,
  alertInstances,
  previousStartedAt,
});

type EmptyHttpResponse = '';
export async function loadRuleState({
  http,
  ruleId,
}: {
  http: HttpSetup;
  ruleId: string;
}): Promise<RuleTaskState> {
  return await http
    .get<AsApiContract<RuleTaskState> | EmptyHttpResponse>(
      `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${ruleId}/state`
    )
    .then((state) => (state ? rewriteBodyRes(state) : {}))
    .then((state: RuleTaskState) => {
      return pipe(
        ruleStateSchema.decode(state),
        fold((e: Errors) => {
          throw new Error(`Rule "${ruleId}" has invalid state`);
        }, identity)
      );
    });
}
