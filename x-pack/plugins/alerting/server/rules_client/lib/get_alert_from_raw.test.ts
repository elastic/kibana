/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { RawRule, RawRuleAction, RecoveredActionGroup, RuleActionTypes } from '../../types';
import { RulesClientContext } from '../types';
import { getAlertFromRaw } from './get_alert_from_raw';

describe('getAlertFromRaw()', () => {
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();

  const kibanaVersion = 'v8.0.0';
  const context: jest.Mocked<RulesClientContext> = {
    taskManager,
    ruleTypeRegistry,
    unsecuredSavedObjectsClient,
    authorization: authorization as unknown as AlertingAuthorization,
    actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
    spaceId: 'default',
    getUserName: jest.fn(),
    createAPIKey: jest.fn(),
    logger: loggingSystemMock.create().get(),
    encryptedSavedObjectsClient: encryptedSavedObjects,
    getActionsClient: jest.fn(),
    getEventLogClient: jest.fn(),
    kibanaVersion,
    minimumScheduleInterval: { value: '1m', enforce: false },
    minimumScheduleIntervalInMs: 1,
    fieldsToExcludeFromPublicApi: [],
    isAuthenticationTypeAPIKey: jest.fn(),
    getAuthenticationAPIKey: jest.fn(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  };

  const rawRule: RawRule = {
    enabled: true,
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'rule-consumer',
    legacyId: null,
    schedule: { interval: '1s' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: '2019-02-12T21:01:22.479Z',
    updatedAt: '2019-02-12T21:01:22.479Z',
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: '2020-08-20T19:23:38Z',
      error: null,
      warning: null,
    },
    revision: 0,
  };

  const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
    id: 'test',
    name: 'My test rule',
    actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    executor: jest.fn(),
    producer: 'alerts',
    cancelAlertsOnRuleTimeout: true,
    ruleTaskTimeout: '5m',
    autoRecoverAlerts: true,
    validate: {
      params: { validate: (params) => params },
    },
  };

  const defaultAction: RawRuleAction = {
    actionRef: 'default-action-ref',
    uuid: '111',
    params: { foo: 'bar' },
    group: 'default',
    actionTypeId: '.test',
    frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
    alertsFilter: {
      query: { dsl: '{test:1}', kql: 'test:1s', filters: [] },
      timeframe: {
        days: [1, 2, 3],
        hours: { end: '15:00', start: '00:00' },
        timezone: 'UTC',
      },
    },
  };

  const systemAction: RawRuleAction = {
    actionRef: 'system-action-ref',
    uuid: '111',
    params: { foo: 'bar' },
    actionTypeId: '.test',
    type: RuleActionTypes.SYSTEM,
  };

  it('removes the dsl query from the default action', () => {
    ruleTypeRegistry.get.mockReturnValue(ruleType);

    const res = getAlertFromRaw(context, '1', '.test', { ...rawRule, actions: [defaultAction] }, [
      { id: 'default-action-id', name: 'default-action-ref', type: 'test' },
    ]);

    expect(res.actions).toEqual([
      {
        id: 'default-action-id',
        uuid: '111',
        params: { foo: 'bar' },
        group: 'default',
        actionTypeId: '.test',
        frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
        alertsFilter: {
          query: { kql: 'test:1s', filters: [] },
          timeframe: {
            days: [1, 2, 3],
            hours: { end: '15:00', start: '00:00' },
            timezone: 'UTC',
          },
        },
      },
    ]);
  });

  it('does not modify system actions', () => {
    ruleTypeRegistry.get.mockReturnValue(ruleType);

    const res = getAlertFromRaw(context, '1', '.test', { ...rawRule, actions: [systemAction] }, [
      { id: 'system-action-id', name: 'system-action-ref', type: 'test' },
    ]);

    expect(res.actions).toEqual([
      {
        actionTypeId: '.test',
        id: 'system-action-id',
        params: {
          foo: 'bar',
        },
        type: RuleActionTypes.SYSTEM,
        uuid: '111',
      },
    ]);
  });
});
