/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import {
  RuleExecutorOptions,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { Logger } from '@kbn/logging';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';

export const createDefaultAlertExecutorOptions = <
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = {},
  InstanceContext extends AlertInstanceContext = {},
  ActionGroupIds extends string = ''
>({
  alertId = 'ALERT_INSTANCE_ID',
  ruleName = 'ALERT_RULE_NAME',
  params,
  state,
  logger,
  createdAt = new Date(),
  startedAt = new Date(),
  updatedAt = new Date(),
  shouldWriteAlerts = true,
}: {
  alertId?: string;
  ruleName?: string;
  params: Params;
  state: State;
  logger: Logger;
  createdAt?: Date;
  startedAt?: Date;
  updatedAt?: Date;
  shouldWriteAlerts?: boolean;
}): RuleExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds> => ({
  startedAt,
  rule: {
    id: alertId,
    updatedBy: null,
    tags: [],
    name: ruleName,
    createdBy: 'CREATED_BY',
    actions: [],
    enabled: true,
    consumer: 'CONSUMER',
    producer: 'ALERT_PRODUCER',
    schedule: { interval: '1m' },
    throttle: null,
    createdAt,
    updatedAt,
    notifyWhen: null,
    ruleTypeId: 'RULE_TYPE_ID',
    ruleTypeName: 'RULE_TYPE_NAME',
    muteAll: false,
    snoozeSchedule: [],
  },
  params,
  spaceId: 'SPACE_ID',
  services: {
    alertFactory: alertsMock.createRuleExecutorServices<InstanceState, InstanceContext>()
      .alertFactory,
    savedObjectsClient: savedObjectsClientMock.create(),
    uiSettingsClient: uiSettingsServiceMock.createClient(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    shouldWriteAlerts: () => shouldWriteAlerts,
    shouldStopExecution: () => false,
    searchSourceClient: searchSourceCommonMock,
    share: {} as SharePluginStart,
    dataViews: dataViewPluginMocks.createStartContract(),
  },
  state,
  previousStartedAt: null,
  namespace: undefined,
  executionId: 'b33f65d7-6e8b-4aae-8d20-c93613deb33f',
  logger,
  flappingSettings: DEFAULT_FLAPPING_SETTINGS,
});
