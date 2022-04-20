/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformConnectorsForExport } from './transform_connectors_for_export';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from '../action_type_registry';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ActionExecutor, TaskRunnerFactory } from '../lib';
import { registerBuiltInActionTypes } from '../builtin_action_types';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';

describe('transform connector for export', () => {
  const inMemoryMetrics = inMemoryMetricsMock.create();
  const actionTypeRegistryParams: ActionTypeRegistryOpts = {
    licensing: licensingMock.createSetup(),
    taskManager: taskManagerMock.createSetup(),
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOCanEncrypt: true }),
      inMemoryMetrics
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: licenseStateMock.create(),
    preconfiguredActions: [],
  };
  const actionTypeRegistry: ActionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);

  registerBuiltInActionTypes({
    logger: loggingSystemMock.create().get(),
    actionTypeRegistry,
    actionsConfigUtils: actionsConfigMock.create(),
  });

  const connectorsWithNoSecrets = [
    {
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: '.email',
        name: 'email connector without auth',
        isMissingSecrets: false,
        config: {
          hasAuth: false,
          from: 'me@me.com',
          host: 'host',
          port: 22,
          service: null,
          secure: null,
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '2',
      type: 'action',
      attributes: {
        actionTypeId: '.index',
        name: 'index connector',
        isMissingSecrets: false,
        config: {
          index: 'test-index',
          refresh: false,
          executionTimeField: null,
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '3',
      type: 'action',
      attributes: {
        actionTypeId: '.server-log',
        name: 'server log connector',
        isMissingSecrets: false,
        config: {},
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '4',
      type: 'action',
      attributes: {
        actionTypeId: '.webhook',
        name: 'webhook connector without auth',
        isMissingSecrets: false,
        config: {
          method: 'post',
          hasAuth: false,
          url: 'https://webhook',
          headers: {},
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
  ];
  const connectorsWithSecrets = [
    {
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: '.email',
        name: 'email connector with auth',
        isMissingSecrets: false,
        config: {
          hasAuth: true,
          from: 'me@me.com',
          host: 'host',
          port: 22,
          service: null,
          secure: null,
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '2',
      type: 'action',
      attributes: {
        actionTypeId: '.resilient',
        name: 'resilient connector',
        isMissingSecrets: false,
        config: {
          apiUrl: 'https://resilient',
          orgId: 'origId',
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '3',
      type: 'action',
      attributes: {
        actionTypeId: '.servicenow',
        name: 'servicenow itsm connector',
        isMissingSecrets: false,
        config: {
          apiUrl: 'https://servicenow',
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '4',
      type: 'action',
      attributes: {
        actionTypeId: '.pagerduty',
        name: 'pagerduty connector',
        isMissingSecrets: false,
        config: {
          apiUrl: 'https://pagerduty',
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '5',
      type: 'action',
      attributes: {
        actionTypeId: '.jira',
        name: 'jira connector',
        isMissingSecrets: false,
        config: {
          apiUrl: 'https://jira',
          projectKey: 'foo',
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '6',
      type: 'action',
      attributes: {
        actionTypeId: '.teams',
        name: 'teams connector',
        isMissingSecrets: false,
        config: {},
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '7',
      type: 'action',
      attributes: {
        actionTypeId: '.slack',
        name: 'slack connector',
        isMissingSecrets: false,
        config: {},
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '8',
      type: 'action',
      attributes: {
        actionTypeId: '.servicenow-sir',
        name: 'servicenow sir connector',
        isMissingSecrets: false,
        config: {
          apiUrl: 'https://servicenow-sir',
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
    {
      id: '8',
      type: 'action',
      attributes: {
        actionTypeId: '.webhook',
        name: 'webhook connector with auth',
        isMissingSecrets: false,
        config: {
          method: 'post',
          hasAuth: true,
          url: 'https://webhook',
          headers: {},
        },
        secrets: 'asbqw4tqbef',
      },
      references: [],
    },
  ];

  it('should not change connectors without secrets', () => {
    expect(transformConnectorsForExport(connectorsWithNoSecrets, actionTypeRegistry)).toEqual(
      connectorsWithNoSecrets
    );
  });

  it('should remove secrets for connectors with secrets', () => {
    expect(transformConnectorsForExport(connectorsWithSecrets, actionTypeRegistry)).toEqual(
      connectorsWithSecrets.map((connector) => ({
        ...connector,
        attributes: {
          ...connector.attributes,
          isMissingSecrets: true,
        },
      }))
    );
  });
});
