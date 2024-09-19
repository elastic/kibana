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
import { IEventLogger, IEvent, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { injectActionParams } from './inject_action_params';
import {
  AlertAction,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RawAlert,
} from '../types';
import { NormalizedAlertType } from '../rule_type_registry';
import { isEphemeralTaskRejectedDueToCapacityError } from '../../../task_manager/server';

export interface CreateExecutionHandlerOptions<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alertId: string;
  alertName: string;
  tags?: string[];
  actionsPlugin: ActionsPluginStartContract;
  actions: AlertAction[];
  spaceId: string;
  apiKey: RawAlert['apiKey'];
  kibanaBaseUrl: string | undefined;
  alertType: NormalizedAlertType<
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
  alertParams: AlertTypeParams;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerAlert: Promise<number>;
}

interface ExecutionHandlerOptions<ActionGroupIds extends string> {
  actionGroup: ActionGroupIds;
  actionSubgroup?: string;
  alertInstanceId: string;
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
  alertId,
  alertName,
  tags,
  actionsPlugin,
  actions: alertActions,
  spaceId,
  apiKey,
  alertType,
  kibanaBaseUrl,
  eventLogger,
  request,
  alertParams,
  supportsEphemeralTasks,
  maxEphemeralActionsPerAlert,
}: CreateExecutionHandlerOptions<
  Params,
  ExtractedParams,
  State,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): ExecutionHandler<ActionGroupIds | RecoveryActionGroupId> {
  const alertTypeActionGroups = new Map(
    alertType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
  );
  return async ({
    actionGroup,
    actionSubgroup,
    context,
    state,
    alertInstanceId,
  }: ExecutionHandlerOptions<ActionGroupIds | RecoveryActionGroupId>) => {
    if (!alertTypeActionGroups.has(actionGroup)) {
      logger.error(`Invalid action group "${actionGroup}" for alert "${alertType.id}".`);
      return;
    }
    const actions = alertActions
      .filter(({ group }) => group === actionGroup)
      .map((action) => {
        return {
          ...action,
          params: transformActionParams({
            actionsPlugin,
            alertId,
            alertType: alertType.id,
            actionTypeId: action.actionTypeId,
            alertName,
            spaceId,
            tags,
            alertInstanceId,
            alertActionGroup: actionGroup,
            alertActionGroupName: alertTypeActionGroups.get(actionGroup)!,
            alertActionSubgroup: actionSubgroup,
            context,
            actionParams: action.params,
            actionId: action.id,
            state,
            kibanaBaseUrl,
            alertParams,
          }),
        };
      })
      .map((action) => ({
        ...action,
        params: injectActionParams({
          ruleId: alertId,
          spaceId,
          actionParams: action.params,
          actionTypeId: action.actionTypeId,
        }),
      }));

    const alertLabel = `${alertType.id}:${alertId}: '${alertName}'`;

    const actionsClient = await actionsPlugin.getActionsClientWithRequest(request);
    let ephemeralActionsToSchedule = await maxEphemeralActionsPerAlert;
    for (const action of actions) {
      if (
        !actionsPlugin.isActionExecutable(action.id, action.actionTypeId, { notifyUsage: true })
      ) {
        logger.warn(
          `Alert "${alertId}" skipped scheduling action "${action.id}" because it is disabled`
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
          id: alertId,
          type: 'alert',
        }),
        relatedSavedObjects: [
          {
            id: alertId,
            type: 'alert',
            namespace: namespace.namespace,
            typeId: alertType.id,
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

      const event: IEvent = {
        event: {
          action: EVENT_LOG_ACTIONS.executeAction,
          kind: 'alert',
          category: [alertType.producer],
        },
        kibana: {
          alerting: {
            instance_id: alertInstanceId,
            action_group_id: actionGroup,
            action_subgroup: actionSubgroup,
          },
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: 'alert',
              id: alertId,
              type_id: alertType.id,
              ...namespace,
            },
            { type: 'action', id: action.id, type_id: action.actionTypeId, ...namespace },
          ],
        },
        rule: {
          id: alertId,
          license: alertType.minimumLicenseRequired,
          category: alertType.id,
          ruleset: alertType.producer,
          name: alertName,
        },
      };

      event.message = `alert: ${alertLabel} instanceId: '${alertInstanceId}' scheduled ${
        actionSubgroup
          ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
          : `actionGroup: '${actionGroup}'`
      } action: ${actionLabel}`;
      eventLogger.logEvent(event);
    }
  };
}
