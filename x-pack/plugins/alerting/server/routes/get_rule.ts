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
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
  SanitizedRule,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const rewriteBodyRes: RewriteResponseCase<SanitizedRule<RuleTypeParams>> = ({
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
  snoozeEndTime,
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
  // Remove this object spread boolean check after snoozeEndTime is added to the public API
  ...(snoozeEndTime !== undefined ? { snooze_end_time: snoozeEndTime } : {}),
  scheduled_task_id: scheduledTaskId,
  execution_status: executionStatus && {
    ...omit(executionStatus, 'lastExecutionDate', 'lastDuration'),
    last_execution_date: executionStatus.lastExecutionDate,
    last_duration: executionStatus.lastDuration,
  },
  actions: actions.map(({ group, id, actionTypeId, params }) => ({
    group,
    id,
    params,
    connector_type_id: actionTypeId,
  })),
});

interface BuildGetRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
}
const buildGetRuleRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
}: BuildGetRulesRouteParams) => {
  router.get(
    {
      path,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const { id } = req.params;
        const rule = await rulesClient.get({ id, excludeFromPublicApi });
        return res.ok({
          body: rewriteBodyRes(rule),
        });
      })
    )
  );
};

export const getRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: true,
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
  });

export const getInternalRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
  });
