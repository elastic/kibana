/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { RuleAction, RuleSystemAction } from '@kbn/alerting-types';
import { RuleRunMetricsStore } from '../../../lib/rule_run_metrics_store';
import { ActionsConfigMap } from '../../../lib/get_actions_config_map';

interface ShouldScheduleActionOpts {
  action: RuleAction | RuleSystemAction;
  actionsConfigMap: ActionsConfigMap;
  isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options?: { notifyUsage: boolean }
  ): boolean;
  logger: Logger;
  ruleId: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
}

export const shouldScheduleAction = (opts: ShouldScheduleActionOpts): boolean => {
  const { actionsConfigMap, action, logger, ruleRunMetricsStore } = opts;

  // keep track of how many actions we want to schedule by connector type
  ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(action.actionTypeId);

  if (ruleRunMetricsStore.hasReachedTheExecutableActionsLimit(actionsConfigMap)) {
    ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
      actionTypeId: action.actionTypeId,
      status: ActionsCompletion.PARTIAL,
    });
    logger.debug(
      `Rule "${opts.ruleId}" skipped scheduling action "${action.id}" because the maximum number of allowed actions has been reached.`
    );
    return false;
  }

  if (
    ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
      actionTypeId: action.actionTypeId,
      actionsConfigMap,
    })
  ) {
    if (!ruleRunMetricsStore.hasConnectorTypeReachedTheLimit(action.actionTypeId)) {
      logger.debug(
        `Rule "${opts.ruleId}" skipped scheduling action "${action.id}" because the maximum number of allowed actions for connector type ${action.actionTypeId} has been reached.`
      );
    }
    ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
      actionTypeId: action.actionTypeId,
      status: ActionsCompletion.PARTIAL,
    });
    return false;
  }

  if (!opts.isActionExecutable(action.id, action.actionTypeId, { notifyUsage: true })) {
    logger.warn(
      `Rule "${opts.ruleId}" skipped scheduling action "${action.id}" because it is disabled`
    );
    return false;
  }

  return true;
};
