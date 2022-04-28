/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  ValidationResult,
  Rule,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../types';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ReactWrapper } from 'enzyme';
import RuleEdit from './rule_edit';
import { useKibana } from '../../../common/lib/kibana';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
jest.mock('../../../common/lib/kibana');
const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

jest.mock('../../lib/rule_api', () => ({
  loadRuleTypes: jest.fn(),
  updateRule: jest.fn().mockRejectedValue({ body: { message: 'Fail message' } }),
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));

jest.mock('../../../common/lib/config_api', () => ({
  triggersActionsUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));

jest.mock('./rule_errors', () => ({
  getRuleActionErrors: jest.fn().mockImplementation(() => {
    return [];
  }),
  getRuleErrors: jest.fn().mockImplementation(() => ({
    ruleParamsErrors: {},
    ruleBaseErrors: {},
    ruleErrors: {
      name: new Array<string>(),
      'schedule.interval': new Array<string>(),
      ruleTypeId: new Array<string>(),
      actionConnectors: new Array<string>(),
    },
  })),
  isValidRule: jest.fn(),
}));

jest.mock('../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isRulesAvailable: true })),
}));

describe('rule_edit', () => {
  let wrapper: ReactWrapper<any>;
  let mockedCoreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    mockedCoreSetup = coreMock.createSetup();
  });

  async function setup(initialRuleFields = {}) {
    const [
      {
        application: { capabilities },
      },
    ] = await mockedCoreSetup.getStartServices();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rules: {
        show: true,
        save: true,
        delete: true,
        execute: true,
      },
    };

    const { loadRuleTypes } = jest.requireMock('../../lib/rule_api');
    const ruleTypes = [
      {
        id: 'my-rule-type',
        name: 'Test',
        actionGroups: [
          {
            id: 'testActionGroup',
            name: 'Test Action Group',
          },
        ],
        defaultActionGroupId: 'testActionGroup',
        minimumLicenseRequired: 'basic',
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: true },
          test: { read: true, all: true },
        },
        actionVariables: {
          context: [],
          state: [],
          params: [],
        },
      },
    ];
    const ruleType = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'test',
      documentationUrl: null,
      validate: (): ValidationResult => {
        return { errors: {} };
      },
      ruleParamsExpression: () => <></>,
      requiresAppContext: false,
    };

    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
        return Promise.resolve({});
      },
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });
    loadRuleTypes.mockResolvedValue(ruleTypes);
    const rule: Rule = {
      id: 'ab5661e0-197e-45ee-b477-302d89193b5e',
      params: {
        aggType: 'average',
        threshold: [1000, 5000],
        index: 'kibana_sample_data_flights',
        timeField: 'timestamp',
        aggField: 'DistanceMiles',
        window: '1s',
        comparator: 'between',
      },
      consumer: 'rules',
      ruleTypeId: 'my-rule-type',
      enabled: false,
      schedule: { interval: '1m' },
      actions: [
        {
          actionTypeId: 'my-action-type',
          group: 'threshold met',
          params: { message: 'Rule [{{ctx.metadata.name}}] has exceeded the threshold' },
          id: '917f5d41-fbc4-4056-a8ad-ac592f7dcee2',
        },
      ],
      tags: [],
      name: 'test rule',
      throttle: null,
      notifyWhen: null,
      apiKeyOwner: null,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: new Date(),
      muteAll: false,
      mutedInstanceIds: [],
      updatedAt: new Date(),
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      ...initialRuleFields,
    };
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.list.mockReturnValue([ruleType]);
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    ruleTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <RuleEdit
        onClose={() => {}}
        initialRule={rule}
        onSave={() => {
          return new Promise<void>(() => {});
        }}
        actionTypeRegistry={actionTypeRegistry}
        ruleTypeRegistry={ruleTypeRegistry}
      />
    );
    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders rule edit flyout', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="editRuleFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveEditedRuleButton"]').exists()).toBeTruthy();
  });

  it('displays a toast message on save for server errors', async () => {
    const { isValidRule } = jest.requireMock('./rule_errors');
    (isValidRule as jest.Mock).mockImplementation(() => {
      return true;
    });
    await setup({ name: undefined });

    await act(async () => {
      wrapper.find('[data-test-subj="saveEditedRuleButton"]').first().simulate('click');
    });
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledWith(
      'Fail message'
    );
  });

  it('should pass in the config into `getRuleErrors`', async () => {
    const { getRuleErrors } = jest.requireMock('./rule_errors');
    await setup();
    const lastCall = getRuleErrors.mock.calls[getRuleErrors.mock.calls.length - 1];
    expect(lastCall[2]).toBeDefined();
    expect(lastCall[2]).toEqual({ minimumScheduleInterval: { value: '1m', enforce: false } });
  });
});
