/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { Logger } from '@kbn/core/server';
import { LegacyAlertsClient } from '..';
import { IAlertsClient } from '../types';
import { AlertsService } from '../../alerts_service';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import {
  AlertInstanceContext,
  AlertInstanceState,
  DEFAULT_FLAPPING_SETTINGS,
  RuleAlertData,
  RuleTypeParams,
  SanitizedRule,
} from '../../types';
import { RuleTaskInstance, RuleTypeRunnerContext } from '../../task_runner/types';
import { MaintenanceWindowsService } from '../../task_runner/maintenance_windows';

export type RuleData<Params extends RuleTypeParams> = Pick<
  SanitizedRule<Params>,
  'id' | 'name' | 'tags' | 'consumer' | 'revision' | 'alertDelay' | 'params'
>;

interface InitializeAlertsClientOpts<Params extends RuleTypeParams> {
  alertsService: AlertsService | null;
  context: RuleTypeRunnerContext;
  executionId: string;
  logger: Logger;
  maxAlerts: number;
  maintenanceWindowsService?: MaintenanceWindowsService;
  rule: RuleData<Params>;
  ruleType: UntypedNormalizedRuleType;
  runTimestamp?: Date;
  startedAt: Date | null;
  taskInstance: RuleTaskInstance;
}

export const initializeAlertsClient = async <
  Params extends RuleTypeParams,
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alertsService,
  context,
  executionId,
  logger,
  maxAlerts,
  maintenanceWindowsService,
  rule,
  ruleType,
  runTimestamp,
  startedAt,
  taskInstance,
}: InitializeAlertsClientOpts<Params>) => {
  const {
    state: {
      alertInstances: alertRawInstances = {},
      alertRecoveredInstances: alertRecoveredRawInstances = {},
    },
  } = taskInstance;

  const alertsClientParams = { logger, maintenanceWindowsService, ruleType };

  // Create AlertsClient if rule type has registered an alerts context
  // with the framework. The AlertsClient will handle reading and
  // writing from alerts-as-data indices and eventually
  // we will want to migrate all the processing of alerts out
  // of the LegacyAlertsClient and into the AlertsClient.
  let alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;

  try {
    const client =
      (await alertsService?.createAlertsClient<
        AlertData,
        State,
        Context,
        ActionGroupIds,
        RecoveryActionGroupId
      >({
        ...alertsClientParams,
        namespace: context.namespace ?? DEFAULT_NAMESPACE_STRING,
        rule: {
          consumer: rule.consumer,
          executionId,
          id: rule.id,
          name: rule.name,
          parameters: rule.params,
          revision: rule.revision,
          spaceId: context.spaceId,
          tags: rule.tags,
          alertDelay: rule.alertDelay?.active ?? 0,
        },
      })) ?? null;

    alertsClient = client
      ? client
      : new LegacyAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>(
          alertsClientParams
        );
  } catch (err) {
    logger.error(
      `Error initializing AlertsClient for context ${ruleType.alerts?.context}. Using legacy alerts client instead. - ${err.message}`
    );

    alertsClient = new LegacyAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      alertsClientParams
    );
  }

  await alertsClient.initializeExecution({
    maxAlerts,
    ruleLabel: context.ruleLogPrefix,
    flappingSettings: context.flappingSettings ?? DEFAULT_FLAPPING_SETTINGS,
    startedAt,
    runTimestamp,
    activeAlertsFromState: alertRawInstances,
    recoveredAlertsFromState: alertRecoveredRawInstances,
  });

  return alertsClient;
};
