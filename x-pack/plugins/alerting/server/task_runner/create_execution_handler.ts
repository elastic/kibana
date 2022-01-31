/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, KibanaRequest } from '../../../../../src/core/server';
import { transformActionParams } from './transform_action_params';
import {
  asSavedObjectExecutionSource,
  PluginStartContract as ActionsPluginStartContract,
} from '../../../actions/server';
import { IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { injectActionParams } from './inject_action_params';
import {
  AlertAction,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RawRule,
} from '../types';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { isEphemeralTaskRejectedDueToCapacityError } from '../../../task_manager/server';
import { createAlertEventLogRecordObject } from '../lib/create_alert_event_log_record_object';

export interface CreateExecutionHandlerOptions<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  ruleId: string;
  ruleName: string;
  executionId: string;
  tags?: string[];
  actionsPlugin: ActionsPluginStartContract;
  actions: AlertAction[];
  spaceId: string;
  apiKey: RawRule['apiKey'];
  kibanaBaseUrl: string | undefined;
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  logger: Logger;
  eventLogger: IEventLogger;
  request: KibanaRequest;
  ruleParams: AlertTypeParams;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerRule: number;
}

interface ExecutionHandlerOptions<ActionGroupIds extends string> {
  actionGroup: ActionGroupIds;
  actionSubgroup?: string;
  alertId: string;
  context: AlertInstanceContext;
  state: AlertInstanceState;
}

export type ExecutionHandler<ActionGroupIds extends string> = (
  options: ExecutionHandlerOptions<ActionGroupIds>
) => Promise<void>;

export function createExecutionHandler<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  logger,
  ruleId,
  ruleName,
  executionId,
  tags,
  actionsPlugin,
  actions: ruleActions,
  spaceId,
  apiKey,
  ruleType,
  kibanaBaseUrl,
  eventLogger,
  request,
  ruleParams,
  supportsEphemeralTasks,
  maxEphemeralActionsPerRule,
}: CreateExecutionHandlerOptions<
  Params,
  ExtractedParams,
  State,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): ExecutionHandler<ActionGroupIds | RecoveryActionGroupId> {
  const ruleTypeActionGroups = new Map(
    ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
  );
  return async ({
    actionGroup,
    actionSubgroup,
    context,
    state,
    alertId,
  }: ExecutionHandlerOptions<ActionGroupIds | RecoveryActionGroupId>) => {
    if (!ruleTypeActionGroups.has(actionGroup)) {
      logger.error(`Invalid action group "${actionGroup}" for rule "${ruleType.id}".`);
      return;
    }
    const actions = ruleActions
      .filter(({ group }) => group === actionGroup)
      .map((action) => {
        return {
          ...action,
          params: transformActionParams({
            actionsPlugin,
            alertId: ruleId,
            alertType: ruleType.id,
            actionTypeId: action.actionTypeId,
            alertName: ruleName,
            spaceId,
            tags,
            alertInstanceId: alertId,
            alertActionGroup: actionGroup,
            alertActionGroupName: ruleTypeActionGroups.get(actionGroup)!,
            alertActionSubgroup: actionSubgroup,
            context,
            actionParams: action.params,
            actionId: action.id,
            state,
            kibanaBaseUrl,
            alertParams: ruleParams,
          }),
        };
      })
      .map((action) => ({
        ...action,
        params: injectActionParams({
          ruleId,
          spaceId,
          actionParams: action.params,
          actionTypeId: action.actionTypeId,
        }),
      }));

    const ruleLabel = `${ruleType.id}:${ruleId}: '${ruleName}'`;

    const actionsClient = await actionsPlugin.getActionsClientWithRequest(request);
    let ephemeralActionsToSchedule = maxEphemeralActionsPerRule;
    for (const action of actions) {
      if (
        !actionsPlugin.isActionExecutable(action.id, action.actionTypeId, { notifyUsage: true })
      ) {
        logger.warn(
          `Rule "${ruleId}" skipped scheduling action "${action.id}" because it is disabled`
        );
        continue;
      }

      const namespace = spaceId === 'default' ? {} : { namespace: spaceId };

      const enqueueOptions = {
        id: action.id,
        params: action.params,
        spaceId,
        apiKey: apiKey ?? null,
        source: asSavedObjectExecutionSource({
          id: ruleId,
          type: 'alert',
        }),
        executionId,
        relatedSavedObjects: [
          {
            id: ruleId,
            type: 'alert',
            namespace: namespace.namespace,
            typeId: ruleType.id,
          },
        ],
      };

      // TODO would be nice  to add the action name here, but it's not available
      const actionLabel = `${action.actionTypeId}:${action.id}`;
      if (supportsEphemeralTasks && ephemeralActionsToSchedule > 0) {
        ephemeralActionsToSchedule--;
        actionsClient.ephemeralEnqueuedExecution(enqueueOptions).catch(async (err) => {
          if (isEphemeralTaskRejectedDueToCapacityError(err)) {
            await actionsClient.enqueueExecution(enqueueOptions);
          }
        });
      } else {
        await actionsClient.enqueueExecution(enqueueOptions);
      }

      const event = createAlertEventLogRecordObject({
        ruleId,
        ruleType: ruleType as UntypedNormalizedRuleType,
        action: EVENT_LOG_ACTIONS.executeAction,
        executionId,
        instanceId: alertId,
        group: actionGroup,
        subgroup: actionSubgroup,
        ruleName,
        savedObjects: [
          {
            type: 'alert',
            id: ruleId,
            typeId: ruleType.id,
            relation: SAVED_OBJECT_REL_PRIMARY,
          },
          {
            type: 'action',
            id: action.id,
            typeId: action.actionTypeId,
          },
        ],
        ...namespace,
        message: `alert: ${ruleLabel} instanceId: '${alertId}' scheduled ${
          actionSubgroup
            ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
            : `actionGroup: '${actionGroup}'`
        } action: ${actionLabel}`,
      });

      eventLogger.logEvent(event);
    }
  };
}
