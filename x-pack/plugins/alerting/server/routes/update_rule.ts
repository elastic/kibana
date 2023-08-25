/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { instanceofZodType, z } from '@kbn/zod';
import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError, validateDurationSchema } from '../lib';
import { UpdateOptions } from '../rules_client';
import {
  verifyAccessAndContext,
  RewriteResponseCase,
  RewriteRequestCase,
  handleDisabledApiKeysError,
  rewriteActionsReq,
  rewriteActionsRes,
  rewriteRuleLastRun,
  actionsSchema,
} from './lib';
import {
  RuleTypeParams,
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  validateNotifyWhenType,
  PartialRule,
  RuleTypeRegistry,
} from '../types';
import { RegistryRuleType } from '../rule_type_registry';

const paramSchema = z.object({
  id: z.string(),
});

export const bodySchema = z
  .object({
    name: z.string({ description: 'The name of the rule.' }),
    tags: z.array(z.string()),
    schedule: z.object({
      interval: z.string().superRefine(validateDurationSchema),
    }),
    throttle: z.nullable(z.optional(z.string().superRefine(validateDurationSchema))),
    params: z.record(z.string(), z.any()),
    actions: actionsSchema,
    notify_when: z.optional(
      z.nullable(
        z
          .enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval'])
          .refine(validateNotifyWhenType)
      )
    ),
  })
  .describe('Update rule request');

export const successResponseSchema = z.object({
  connector_type_id: z
    .string()
    .describe(
      'The type of connector. This property appears in responses but cannot be set in requests.'
    ),
  group: z
    .string()
    .describe(
      `The group name for the actions. If you don't need to group actions, set to \`default\`.`
    ),
  id: z.string().describe('The identifier for the connector saved object.'),
  uuid: z.string().describe('A universally unique identifier (UUID) for the action.'),
  params: z
    .record(z.string(), z.any())
    .describe(
      'The parameters for the action, which are sent to the connector. The `params` are handled as Mustache templates and passed a default set of context.'
    ),
});

const rewriteBodyReq: RewriteRequestCase<UpdateOptions<RuleTypeParams>> = (result) => {
  const { notify_when: notifyWhen, actions, ...rest } = result.data;
  return {
    ...result,
    data: {
      ...rest,
      notifyWhen,
      actions: rewriteActionsReq(actions),
    },
  };
};
const rewriteBodyRes: RewriteResponseCase<PartialRule<RuleTypeParams>> = ({
  actions,
  alertTypeId,
  scheduledTaskId,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  apiKeyOwner,
  apiKeyCreatedByUser,
  notifyWhen,
  muteAll,
  mutedInstanceIds,
  executionStatus,
  snoozeSchedule,
  isSnoozedUntil,
  lastRun,
  nextRun,
  ...rest
}) => ({
  ...rest,
  api_key_owner: apiKeyOwner,
  created_by: createdBy,
  updated_by: updatedBy,
  snooze_schedule: snoozeSchedule,
  ...(isSnoozedUntil ? { is_snoozed_until: isSnoozedUntil } : {}),
  ...(alertTypeId ? { rule_type_id: alertTypeId } : {}),
  ...(scheduledTaskId ? { scheduled_task_id: scheduledTaskId } : {}),
  ...(createdAt ? { created_at: createdAt } : {}),
  ...(updatedAt ? { updated_at: updatedAt } : {}),
  ...(notifyWhen ? { notify_when: notifyWhen } : {}),
  ...(muteAll !== undefined ? { mute_all: muteAll } : {}),
  ...(mutedInstanceIds ? { muted_alert_ids: mutedInstanceIds } : {}),
  ...(executionStatus
    ? {
        execution_status: {
          status: executionStatus.status,
          last_execution_date: executionStatus.lastExecutionDate,
          last_duration: executionStatus.lastDuration,
        },
      }
    : {}),
  ...(actions
    ? {
        actions: rewriteActionsRes(actions),
      }
    : {}),
  ...(lastRun ? { last_run: rewriteRuleLastRun(lastRun) } : {}),
  ...(nextRun ? { next_run: nextRun } : {}),
  ...(apiKeyCreatedByUser !== undefined ? { api_key_created_by_user: apiKeyCreatedByUser } : {}),
});

export const updateRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  ruleTypeRegistry: RuleTypeRegistry
) => {
  router.versioned
    .put({
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      access: 'public',
      description: 'Update a rule',
    })
    .addVersion(
      {
        version: '2023-10-31',
        // Lazily provide validation to the endpoint
        validate: () => {
          const paramSchemas = Array.from(
            ruleTypeRegistry.list({ addParamsValidationSchemas: true }).values()
          )
            .map((ruleType: RegistryRuleType) => {
              if (ruleType.validate && instanceofZodType(ruleType.validate.params)) {
                return ruleType.validate.params;
              }
            })
            .filter(Boolean) as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]];

          const bodySchemaWithParams = bodySchema.merge(
            z.object({ params: z.union(paramSchemas) })
          );

          return {
            request: {
              body: bodySchemaWithParams,
              params: paramSchema,
            },
            response: {
              200: {
                body: successResponseSchema,
              },
            },
          };
        },
      },
      handleDisabledApiKeysError(
        router.handleLegacyErrors(
          verifyAccessAndContext(licenseState, async function (context, req, res) {
            const rulesClient = (await context.alerting).getRulesClient();
            const { id } = req.params;
            const rule = req.body;
            try {
              const alertRes = await rulesClient.update(rewriteBodyReq({ id, data: rule }));
              return res.ok({
                body: rewriteBodyRes(alertRes),
              });
            } catch (e) {
              if (e instanceof RuleTypeDisabledError) {
                return e.sendResponse(res);
              }
              throw e;
            }
          })
        )
      )
    );
};
