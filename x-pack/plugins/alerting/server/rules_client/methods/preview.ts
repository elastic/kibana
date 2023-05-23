/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import { flatMap, trim, truncate } from 'lodash';
import {
  ALERT_RULE_EXECUTION_UUID,
  ALERT_STATUS,
  getRuleDetailsRoute,
  triggersActionsRoute,
} from '@kbn/rule-data-utils';
import { SearchHitsMetadata } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/logging';
import { Rule, RuleAction, RuleExecutionStatuses } from '../../types';
import { validateRuleTypeParams } from '../../lib';
import { apiKeyAsAlertAttributes } from '../common';
import { NormalizedAlertAction, RulesClientContext } from '../types';
import { PREVIEW_COMPLETE_STATUS } from '../../alerts_client/preview_alerts_client';
import {
  transformSummaryActionParams,
  transformActionParams,
} from '../../task_runner/transform_action_params';
import { DEFAULT_MAX_ALERTS } from '../../config';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PreviewOptions {
  data: Omit<
    Rule<any>,
    | 'id'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
    | 'apiKey'
    | 'apiKeyOwner'
    | 'apiKeyCreatedByUser'
    | 'muteAll'
    | 'mutedInstanceIds'
    | 'actions'
    | 'executionStatus'
    | 'snoozeSchedule'
    | 'isSnoozedUntil'
    | 'lastRun'
    | 'nextRun'
    | 'revision'
  > & { actions: NormalizedAlertAction[] };
}

export interface PreviewResults {
  uuid: string;
  alerts: any[];
  actions: RuleAction[];
}

export async function preview(
  context: RulesClientContext,
  { data }: PreviewOptions
): Promise<PreviewResults> {
  const alertsClient = await context.alertsService?.createPreviewAlertsClient({
    logger: context.logger,
  });

  if (!alertsClient) {
    throw new Error(`Error getting alerts client! Something went wrong`);
  }

  const executionUuid = uuidv4();
  const temporaryRuleId = `preview-${uuidv4()}`;

  context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);

  // Throws an error if alert type isn't registered
  const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);
  const ruleTypeActionGroups = new Map(
    ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
  );

  const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);
  const username = await context.getUserName();
  const createTime = new Date();

  // Create an API key for the preview and invalidate at the end
  let createdAPIKey = null;
  try {
    const name = truncate(`AlertingPreview: ${ruleType.id}/${trim(data.name)}`, { length: 256 });
    createdAPIKey = await context.createAPIKey(name);
  } catch (error) {
    throw Boom.badRequest(
      `Error previewing rule: could not create temporary API key - ${error.message}`
    );
  }

  await context.taskManager.schedule({
    taskType: `alerting:preview`,
    params: {
      executionUuid,
      rule: {
        ...data,
        ...apiKeyAsAlertAttributes(createdAPIKey, username, false),
        params: validatedAlertTypeParams,
        spaceId: context.spaceId,
        id: temporaryRuleId,
      },
    },
    state: {},
    scope: ['alerting'],
  });

  // Poll the alerts index for the document indicating that preview execution
  // has completed
  await checkForPreviewComplete(
    () =>
      alertsClient.search({
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_EXECUTION_UUID]: executionUuid,
                },
              },
              {
                term: {
                  [ALERT_STATUS]: PREVIEW_COMPLETE_STATUS,
                },
              },
            ],
          },
        },
      }),
    { logger: context.logger }
  );

  // Get the alerts documents for this preview
  const alertDocs = await alertsClient.search({
    size: DEFAULT_MAX_ALERTS,
    query: {
      bool: {
        must_not: [
          {
            term: {
              [ALERT_STATUS]: PREVIEW_COMPLETE_STATUS,
            },
          },
        ],
        filter: [
          {
            term: {
              [ALERT_RULE_EXECUTION_UUID]: executionUuid,
            },
          },
        ],
      },
    },
  });

  // Fill in the action message with the data
  const actionsToPreview = await injectConnectorType(context, data.actions ?? []);

  const rule = {
    ...data,
    id: temporaryRuleId,
    actions: actionsToPreview,
    apiKeyOwner: username,
    createdBy: username,
    updatedBy: username,
    createdAt: createTime,
    updatedAt: createTime,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'pending' as RuleExecutionStatuses,
      lastExecutionDate: createTime,
    },
    revision: 0,
  };

  const previewActions = flatMap(
    actionsToPreview.map((action: RuleAction) => {
      if (action.frequency?.summary === true) {
        return {
          ...action,
          params: transformSummaryActionParams({
            alerts: {
              new: {
                count: alertDocs.length,
                data: alertDocs,
              },
              ongoing: {
                count: 0,
                data: [],
              },
              recovered: {
                count: 0,
                data: [],
              },
              all: {
                count: alertDocs.length,
                data: alertDocs,
              },
            },
            rule,
            ruleTypeId: ruleType.id,
            actionId: action.id,
            actionParams: action.params,
            spaceId: context.spaceId,
            actionsPlugin: context.actionsPlugin,
            actionTypeId: action.actionTypeId,
            kibanaBaseUrl: context.kibanaBaseUrl,
            ruleUrl: buildRuleUrl(context, ruleType, rule),
          }),
        };
      } else {
        return alertDocs.map((alertHit: any) => {
          const alert = alertHit._source;
          return {
            ...action,
            params: transformActionParams({
              actionsPlugin: context.actionsPlugin,
              alertId: temporaryRuleId,
              alertType: ruleType.id,
              actionTypeId: action.actionTypeId,
              alertName: data.name,
              spaceId: context.spaceId,
              tags: data.tags,
              alertInstanceId: alert.kibana.alert.instance.id,
              alertUuid: alert.kibana.alert.uuid,
              alertActionGroup: alert.kibana.alert.action_group,
              alertActionGroupName: ruleTypeActionGroups!.get(alert.kibana.alert.action_group)!,
              context: alert.kibana.alert.context,
              actionId: action.id,
              state: alert.kibana.alert.state,
              kibanaBaseUrl: context.kibanaBaseUrl,
              alertParams: data.params,
              actionParams: action.params,
              flapping: alert.kibana.alert.flapping,
              ruleUrl: buildRuleUrl(context, ruleType, rule),
            }),
          };
        });
      }
    })
  );

  return { uuid: executionUuid, alerts: alertDocs, actions: previewActions };
}

const MAX_ATTEMPTS = 10;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const checkForPreviewComplete = async (
  checkQuery: () => Promise<SearchHitsMetadata<unknown>['hits']>,
  {
    logger,
    attempt = 0,
  }: {
    logger: Logger;
    attempt?: number;
  }
): Promise<void> => {
  try {
    const hits: SearchHitsMetadata<unknown>['hits'] = await checkQuery();
    if (hits.length < 1) {
      throw new Error(`preview is not yet complete`);
    }
  } catch (e) {
    if (attempt < MAX_ATTEMPTS) {
      const retryCount = attempt + 1;
      const retryDelaySec: number = Math.min(Math.pow(2, retryCount), 30); // 2s, 4s, 8s, 16s, 30s, 30s, 30s...

      logger.warn(`Checking again after [${retryDelaySec}s]}`);

      // delay with some randomness
      await delay(retryDelaySec * 1000 * Math.random());
      return checkForPreviewComplete(checkQuery, { logger, attempt: retryCount });
    }

    throw e;
  }
};

const injectConnectorType = async (
  context: RulesClientContext,
  actions: NormalizedAlertAction[]
): Promise<RuleAction[]> => {
  const normalizedActions: RuleAction[] = [];
  const actionsClient = await context.getActionsClient();
  const actionIds = [...new Set(actions.map((action) => action.id))];
  const actionResults = await actionsClient.getBulk(actionIds);
  actions.forEach((alertAction) => {
    const actionResultValue = actionResults.find((action) => action.id === alertAction.id);
    if (actionResultValue) {
      normalizedActions.push({
        ...alertAction,
        actionTypeId: actionResultValue.actionTypeId,
      });
    }
  });

  return normalizedActions;
};

const buildRuleUrl = (
  context: RulesClientContext,
  ruleType: any,
  rule: any
): string | undefined => {
  if (!context.kibanaBaseUrl) {
    return;
  }

  const relativePath = ruleType.getViewInAppRelativeUrl
    ? ruleType.getViewInAppRelativeUrl({ rule })
    : `${triggersActionsRoute}${getRuleDetailsRoute(rule.id)}`;

  try {
    const ruleUrl = new URL(
      `${context.spaceId !== 'default' ? `/s/${context.spaceId}` : ''}${relativePath}`,
      context.kibanaBaseUrl
    );

    return ruleUrl.toString();
  } catch (error) {
    context.logger.debug(
      `Rule "${rule.id}" encountered an error while constructing the rule.url variable: ${error.message}`
    );
    return;
  }
};
