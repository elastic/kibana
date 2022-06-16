/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { isEphemeralTaskRejectedDueToCapacityError } from '@kbn/task-manager-plugin/server';
import { ExecuteOptions } from '@kbn/actions-plugin/server';
import { transformActionParams } from './transform_action_params';
import { injectActionParams } from './inject_action_params';
import {
  ActionsCompletion,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '../types';
import { CreateExecutionHandlerOptions, ExecutionHandlerOptions } from './types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';

export type ExecutionHandler<ActionGroupIds extends string> = (
  ruleRunMetricsStore: RuleRunMetricsStore,
  alertsToExecute: Array<ExecutionHandlerOptions<ActionGroupIds>>
) => Promise<void>;

export function createExecutionHandler<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  logger,
  ruleId,
  ruleName,
  ruleConsumer,
  executionId,
  tags,
  actionsPlugin,
  actions: ruleActions,
  spaceId,
  apiKey,
  ruleType,
  kibanaBaseUrl,
  alertingEventLogger,
  request,
  ruleParams,
  supportsEphemeralTasks,
  maxEphemeralActionsPerRule,
  actionsConfigMap,
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

  return async (
    ruleRunMetricsStore: RuleRunMetricsStore,
    alertsToExecute: Array<ExecutionHandlerOptions<ActionGroupIds | RecoveryActionGroupId>>
  ) => {
    const alertsToEnqueue: ExecuteOptions[] = [];
    const actionsClient = await actionsPlugin.getActionsClientWithRequest(request);

    for (const alert of alertsToExecute) {
      const { actionGroup, actionSubgroup, context, state, alertId } = alert;

      if (!ruleTypeActionGroups.has(actionGroup)) {
        logger.error(`Invalid action group "${actionGroup}" for rule "${ruleType.id}".`);
      } else {
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

        ruleRunMetricsStore.incrementNumberOfGeneratedActions(actions.length);

        let ephemeralActionsToSchedule = maxEphemeralActionsPerRule;
        for (const action of actions) {
          const { actionTypeId } = action;

          ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(actionTypeId);

          if (ruleRunMetricsStore.hasReachedTheExecutableActionsLimit(actionsConfigMap)) {
            ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
              actionTypeId,
              status: ActionsCompletion.PARTIAL,
            });
            logger.debug(
              `Rule "${ruleId}" skipped scheduling action "${action.id}" because the maximum number of allowed actions has been reached.`
            );
            break;
          }

          if (
            ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
              actionTypeId,
              actionsConfigMap,
            })
          ) {
            if (!ruleRunMetricsStore.hasConnectorTypeReachedTheLimit(actionTypeId)) {
              logger.debug(
                `Rule "${ruleId}" skipped scheduling action "${action.id}" because the maximum number of allowed actions for connector type ${actionTypeId} has been reached.`
              );
            }
            ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
              actionTypeId,
              status: ActionsCompletion.PARTIAL,
            });
            continue;
          }

          if (!actionsPlugin.isActionExecutable(action.id, actionTypeId, { notifyUsage: true })) {
            logger.warn(
              `Rule "${ruleId}" skipped scheduling action "${action.id}" because it is disabled`
            );
            continue;
          }

          ruleRunMetricsStore.incrementNumberOfTriggeredActions();
          ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(actionTypeId);

          const namespace = spaceId === 'default' ? {} : { namespace: spaceId };

          const enqueueOptions = {
            id: action.id,
            params: action.params,
            spaceId,
            apiKey: apiKey ?? null,
            consumer: ruleConsumer,
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

          if (supportsEphemeralTasks && ephemeralActionsToSchedule > 0) {
            ephemeralActionsToSchedule--;
            try {
              await actionsClient.ephemeralEnqueuedExecution(enqueueOptions);
            } catch (err) {
              if (isEphemeralTaskRejectedDueToCapacityError(err)) {
                alertsToEnqueue.push(enqueueOptions);
                // await actionsClient.enqueueExecutions(enqueueOptions);
              }
            }
          } else {
            alertsToEnqueue.push(enqueueOptions);
            // await actionsClient.enqueueExecutions(enqueueOptions);
          }

          alertingEventLogger.logAction({
            id: action.id,
            typeId: actionTypeId,
            alertId,
            alertGroup: actionGroup,
            alertSubgroup: actionSubgroup,
          });
        }
      }
    }

    if (alertsToEnqueue.length > 0) {
      await actionsClient.enqueueExecutions(alertsToEnqueue);
    }
  };
}
