/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { RewriteResponseCase } from '../../../../../actions/common';
import { Alert, AlertUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import {
  transformAction,
  transformAlert,
  transformExecutionStatus,
} from './common_transformations';

const rewriteBodyRequest: RewriteResponseCase<
  Omit<AlertUpdates, 'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'>
> = ({ alertTypeId, notifyWhen, actions, ...res }): any => ({
  ...res,
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  actions: actions.map(({ group, id, actionTypeId, params }) => ({
    group,
    id,
    params,
    connector_type_id: actionTypeId,
  })),
});

export async function createAlert({
  http,
  alert,
}: {
  http: HttpSetup;
  alert: Omit<
    AlertUpdates,
    'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
  >;
}): Promise<Alert> {
  const res = await http.post(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(rewriteBodyRequest(alert)),
  });
  const actions = res.actions.map((action: any) => transformAction(action));
  const executionStatus = transformExecutionStatus
    ? transformExecutionStatus(res.execution_status)
    : undefined;
  return transformAlert({ ...res, actions, execution_status: executionStatus });
}
