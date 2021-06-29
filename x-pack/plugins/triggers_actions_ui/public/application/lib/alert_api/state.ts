/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { Errors, identity } from 'io-ts';
import { AlertTaskState } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { alertStateSchema } from '../../../../../alerting/common';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';

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
