/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationSchema, AlertTypeDisabledError } from '../lib';
import { CreateOptions } from '../rules_client';
import {
  RewriteRequestCase,
  RewriteResponseCase,
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
} from './lib';
import {
  SanitizedAlert,
  validateNotifyWhenType,
  AlertTypeParams,
  BASE_ALERTING_API_PATH,
  AlertNotifyWhenType,
} from '../types';
import { RouteOptions } from '.';

export const bodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationSchema }),
  }),
  actions: schema.arrayOf(
    schema.object({
      group: schema.string(),
      id: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    }),
    { defaultValue: [] }
  ),
  notify_when: schema.string({ validate: validateNotifyWhenType }),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions<AlertTypeParams>['data']> = ({
  rule_type_id: alertTypeId,
  notify_when: notifyWhen,
  ...rest
}) => ({
  ...rest,
  alertTypeId,
  notifyWhen,
});
const rewriteBodyRes: RewriteResponseCase<SanitizedAlert<AlertTypeParams>> = ({
  actions,
  alertTypeId,
  scheduledTaskId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus: { lastExecutionDate, ...executionStatus },
  ...rest
}) => ({
  ...rest,
  rule_type_id: alertTypeId,
  scheduled_task_id: scheduledTaskId,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  api_key_owner: apiKeyOwner,
  notify_when: notifyWhen,
  mute_all: muteAll,
  muted_alert_ids: mutedInstanceIds,
  execution_status: {
    ...executionStatus,
    last_execution_date: lastExecutionDate,
  },
  actions: actions.map(({ group, id, actionTypeId, params }) => ({
    group,
    id,
    params,
    connector_type_id: actionTypeId,
  })),
});

export const createRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id?}`,
      validate: {
        params: schema.maybe(
          schema.object({
            id: schema.maybe(schema.string()),
          })
        ),
        body: bodySchema,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = context.alerting.getRulesClient();
          const rule = req.body;
          const params = req.params;

          countUsageOfPredefinedIds({
            predefinedId: params?.id,
            spaceId: rulesClient.getSpaceId(),
            usageCounter,
          });

          try {
            const createdRule: SanitizedAlert<AlertTypeParams> =
              await rulesClient.create<AlertTypeParams>({
                data: rewriteBodyReq({
                  ...rule,
                  notify_when: rule.notify_when as AlertNotifyWhenType,
                }),
                options: { id: params?.id },
              });
            return res.ok({
              body: rewriteBodyRes(createdRule),
            });
          } catch (e) {
            if (e instanceof AlertTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
