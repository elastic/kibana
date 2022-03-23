/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import { TaskRunnerFactory } from '../task_runner';
import { RuleTypeRegistry, ConstructorOptions } from '../rule_type_registry';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { ILicenseState } from '../lib/license_state';
import { licenseStateMock } from '../lib/license_state.mock';
import { licensingMock } from '../../../licensing/server/mocks';
import { isRuleExportable } from './is_rule_exportable';
import { loggingSystemMock } from 'src/core/server/mocks';

let ruleTypeRegistryParams: ConstructorOptions;
let logger: MockedLogger;
let mockedLicenseState: jest.Mocked<ILicenseState>;
const taskManager = taskManagerMock.createSetup();

beforeEach(() => {
  jest.resetAllMocks();
  mockedLicenseState = licenseStateMock.create();
  logger = loggerMock.create();
  ruleTypeRegistryParams = {
    logger: loggingSystemMock.create().get(),
    taskManager,
    taskRunnerFactory: new TaskRunnerFactory(),
    licenseState: mockedLicenseState,
    licensing: licensingMock.createSetup(),
    minimumScheduleInterval: { value: '1m', enforce: false },
  };
});

describe('isRuleExportable', () => {
  it('should return true if rule type isExportable is true', () => {
    const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
    registry.register({
      id: 'foo',
      name: 'Foo',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: jest.fn(),
      producer: 'alerts',
    });
    expect(
      isRuleExportable(
        {
          id: '1',
          type: 'alert',
          attributes: {
            enabled: true,
            name: 'rule-name',
            tags: ['tag-1', 'tag-2'],
            alertTypeId: 'foo',
            consumer: 'alert-consumer',
            schedule: { interval: '1m' },
            actions: [],
            params: {},
            createdBy: 'me',
            updatedBy: 'me',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            apiKey: '4tndskbuhewotw4klrhgjewrt9u',
            apiKeyOwner: 'me',
            throttle: null,
            notifyWhen: 'onActionGroupChange',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: '2020-08-20T19:23:38Z',
              error: null,
            },
            scheduledTaskId: '2q5tjbf3q45twer',
          },
          references: [],
        },
        registry,
        logger
      )
    ).toEqual(true);
  });

  it('should return false and log warning if rule type isExportable is false', () => {
    const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
    registry.register({
      id: 'foo',
      name: 'Foo',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: false,
      executor: jest.fn(),
      producer: 'alerts',
    });
    expect(
      isRuleExportable(
        {
          id: '1',
          type: 'alert',
          attributes: {
            enabled: true,
            name: 'rule-name',
            tags: ['tag-1', 'tag-2'],
            alertTypeId: 'foo',
            consumer: 'alert-consumer',
            schedule: { interval: '1m' },
            actions: [],
            params: {},
            createdBy: 'me',
            updatedBy: 'me',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            apiKey: '4tndskbuhewotw4klrhgjewrt9u',
            apiKeyOwner: 'me',
            throttle: null,
            notifyWhen: 'onActionGroupChange',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: '2020-08-20T19:23:38Z',
              error: null,
            },
            scheduledTaskId: '2q5tjbf3q45twer',
          },
          references: [],
        },
        registry,
        logger
      )
    ).toEqual(false);
    expect(logger.warn).toHaveBeenCalledWith(
      `Skipping export of rule \"1\" because rule type \"foo\" is not exportable through this interface.`
    );
  });

  it('should return false and log warning if rule type is not registered', () => {
    const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
    registry.register({
      id: 'foo',
      name: 'Foo',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: false,
      executor: jest.fn(),
      producer: 'alerts',
    });
    expect(
      isRuleExportable(
        {
          id: '1',
          type: 'alert',
          attributes: {
            enabled: true,
            name: 'rule-name',
            tags: ['tag-1', 'tag-2'],
            alertTypeId: 'bar',
            consumer: 'alert-consumer',
            schedule: { interval: '1m' },
            actions: [],
            params: {},
            createdBy: 'me',
            updatedBy: 'me',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            apiKey: '4tndskbuhewotw4klrhgjewrt9u',
            apiKeyOwner: 'me',
            throttle: null,
            notifyWhen: 'onActionGroupChange',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: '2020-08-20T19:23:38Z',
              error: null,
            },
            scheduledTaskId: '2q5tjbf3q45twer',
          },
          references: [],
        },
        registry,
        logger
      )
    ).toEqual(false);
    expect(logger.warn).toHaveBeenCalledWith(
      `Skipping export of rule \"1\" because rule type \"bar\" is not recognized.`
    );
  });
});
