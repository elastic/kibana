/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { RulesClientContext } from '../types';
import { RuleAlertData, AlertInstanceState, AlertInstanceContext } from '../../types';

import { ReportedAlert, ReportedAlertData } from '../../alerts_client/types';
import { AlertsClient } from '../../alerts_client/alerts_client';
import { Params } from '../../../../stack_alerts/server/rule_types/user_defined/rule_type';

export async function test(context: RulesClientContext, options: { params: Params }) {
  const ruleType = context.ruleTypeRegistry.get('.user-defined');

  type AlertToReport = ReportedAlert<
    RuleAlertData,
    AlertInstanceState,
    AlertInstanceContext,
    string
  >;
  const reportedAlerts: AlertToReport[] = [];

  // TODO: Remove API Key after usage
  const createdApiKey = await context.createAPIKey(v4());
  const apiKey = createdApiKey.apiKeysEnabled
    ? Buffer.from(`${createdApiKey.result!.id}:${createdApiKey.result!.api_key}`).toString('base64')
    : undefined;

  let alertLimitReached: boolean = false;
  const alertsClientStub: ReturnType<
    AlertsClient<RuleAlertData, AlertInstanceState, AlertInstanceContext, string, string>['client']
  > = {
    setAlertLimitReached: (reached: boolean) => {
      alertLimitReached = reached;
    },
    getAlertLimitValue: () => 1000,
    report: (alert: AlertToReport): ReportedAlertData => {
      reportedAlerts.push(alert);
      return { uuid: v4(), start: new Date().toISOString() };
    },
    setAlertData: () => {},
    getRecoveredAlerts: () => [],
  };

  await ruleType.executor({
    apiKey,
    params: options.params,
    logger: context.logger,
    queryDelay: 0,
    services: {
      alertsClient: alertsClientStub,
      shouldStopExecution: () => false,
    },
  } as any);

  return { reportedAlerts, alertLimitReached };
}
