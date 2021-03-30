/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext, RewriteResponseCase } from './lib';
import {
  AlertTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  SanitizedAlert,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const rewriteBodyRes: RewriteResponseCase<SanitizedAlert<AlertTypeParams>> = ({
  alertTypeId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus,
  actions,
  scheduledTaskId,
  ...rest
}) => ({
  ...rest,
  rule_type_id: alertTypeId,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  scheduled_task_id: scheduledTaskId,
  execution_status: executionStatus && {
    ...omit(executionStatus, 'lastExecutionDate'),
    last_execution_date: executionStatus.lastExecutionDate,
  },
  actions: actions.map(({ group, id, actionTypeId, params }) => ({
    group,
    id,
    params,
    connector_type_id: actionTypeId,
  })),
});

export const getRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertsClient = context.alerting.getAlertsClient();
        const { id } = req.params;
        const rule = await alertsClient.get({ id });
        return res.ok({
          body: rewriteBodyRes(rule),
        });
      })
    )
  );
};
