/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type { Errors } from 'io-ts';
import { identity } from 'io-ts';
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import type {
  AsApiContract,
  RewriteRequestCase,
} from '../../../../../actions/common/rewrite_request_case';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../alerting/common';
import type { AlertTaskState } from '../../../../../alerting/common/alert_task_instance';
import { alertStateSchema } from '../../../../../alerting/common/alert_task_instance';

const rewriteBodyRes: RewriteRequestCase<AlertTaskState> = ({
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
export async function loadAlertState({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertTaskState> {
  return await http
    .get(`${INTERNAL_BASE_ALERTING_API_PATH}/rule/${alertId}/state`)
    .then((state: AsApiContract<AlertTaskState> | EmptyHttpResponse) =>
      state ? rewriteBodyRes(state) : {}
    )
    .then((state: AlertTaskState) => {
      return pipe(
        alertStateSchema.decode(state),
        fold((e: Errors) => {
          throw new Error(`Alert "${alertId}" has invalid state`);
        }, identity)
      );
    });
}
