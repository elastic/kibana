/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { nextTick } from '@kbn/test-jest-helpers';
import { RuleDefinition } from './rule_definition';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ActionTypeModel, Rule, RuleTypeModel } from '../../../../types';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('./rule_actions', () => ({
  RuleActions: () => {
    return <></>;
  },
}));

jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
  hasManageApiKeysCapability: jest.fn(() => true),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn(),
}));
const { useLoadRuleTypesQuery } = jest.requireMock('../../../hooks/use_load_rule_types_query');

const mockedRuleTypeIndex = new Map(
  Object.entries({
    test_rule_type: {
      enabledInLicense: true,
      id: 'test_rule_type',
      name: 'test rule',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      actionVariables: { context: [], state: [] },
      defaultActionGroupId: 'default',
      producer: ALERTING_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        [ALERTING_FEATURE_ID]: { read: true, all: false },
      },
      ruleTaskTimeout: '1m',
    },
    '2': {
      enabledInLicense: true,
      id: '2',
      name: 'test rule ok',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      actionVariables: { context: [], state: [] },
      defaultActionGroupId: 'default',
      producer: ALERTING_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        [ALERTING_FEATURE_ID]: { read: true, all: false },
      },
      ruleTaskTimeout: '1m',
    },
    '3': {
      enabledInLicense: true,
      id: '3',
      name: 'test rule pending',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      actionVariables: { context: [], state: [] },
      defaultActionGroupId: 'default',
      producer: ALERTING_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        [ALERTING_FEATURE_ID]: { read: true, all: false },
      },
      ruleTaskTimeout: '1m',
    },
  })
);

interface SetupProps {
  ruleOverwrite?: any;
}

describe('Rule Definition', () => {
  let wrapper: ReactWrapper;
  async function setup({ ruleOverwrite }: SetupProps = {}) {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const ruleTypeRegistry = ruleTypeRegistryMock.create();
    const mockedRule = mockRule(ruleOverwrite);
    jest.mock('../../../lib/capabilities', () => ({
      hasAllPrivilege: jest.fn(() => true),
      hasSaveRulesCapability: jest.fn(() => true),
      hasExecuteActionsCapability: jest.fn(() => true),
      hasManageApiKeysCapability: jest.fn(() => true),
    }));
    ruleTypeRegistry.has.mockImplementation((id) => {
      if (id === 'siem_rule') {
        return false;
      }
      return true;
    });
    const ruleTypeR: RuleTypeModel = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: false,
    };
    ruleTypeRegistry.get.mockImplementation((id) => {
      if (id === 'siem_rule') {
        throw new Error('error');
      }
      return ruleTypeR;
    });
    actionTypeRegistry.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ] as ActionTypeModel[]);

    useLoadRuleTypesQuery.mockReturnValue({ ruleTypesState: { data: mockedRuleTypeIndex } });

    wrapper = mount(
      <QueryClientProvider client={new QueryClient()}>
        <RuleDefinition
          rule={mockedRule}
          actionTypeRegistry={actionTypeRegistry}
          onEditRule={jest.fn()}
          ruleTypeRegistry={ruleTypeRegistry}
        />
      </QueryClientProvider>
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  beforeEach(async () => await setup());
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders rule definition ', async () => {
    expect(wrapper.find('[data-test-subj="ruleSummaryRuleDefinition"]')).toBeTruthy();
  });

  it('show rule type name from "useLoadRuleTypesQuery"', async () => {
    expect(useLoadRuleTypesQuery).toHaveBeenCalledTimes(2);
    const ruleType = wrapper.find('[data-test-subj="ruleSummaryRuleType"]');
    expect(ruleType).toBeTruthy();
    expect(ruleType.find('div.euiText').text()).toEqual(
      mockedRuleTypeIndex.get(mockRule().ruleTypeId)?.name
    );
  });

  it('show rule type description "', async () => {
    const ruleDescription = wrapper.find('[data-test-subj="ruleSummaryRuleDescription"]');
    expect(ruleDescription).toBeTruthy();
    expect(ruleDescription.find('div.euiText').text()).toEqual('Rule when testing');
  });

  it('show SIEM rule type description "', async () => {
    await setup({
      ruleOverwrite: {
        consumer: 'siem',
        ruleTypeId: 'siem_rule',
      },
    });
    const ruleDescription = wrapper.find('[data-test-subj="ruleSummaryRuleDescription"]');
    expect(ruleDescription).toBeTruthy();
    expect(ruleDescription.find('div.euiText').text()).toEqual('Security detection rule');
  });

  it('show rule conditions "', async () => {
    const ruleConditions = wrapper.find('[data-test-subj="ruleSummaryRuleConditions"]');
    expect(ruleConditions).toBeTruthy();
    expect(ruleConditions.find('div.euiText').text()).toEqual(`0 conditions`);
  });

  it('show rule interval with human readable value', async () => {
    const ruleInterval = wrapper.find('[data-test-subj="ruleSummaryRuleInterval"]');
    expect(ruleInterval).toBeTruthy();
    expect(ruleInterval.find('div.euiText').text()).toEqual('1 sec');
  });

  it('show edit button when user has permissions', async () => {
    const editButton = wrapper.find('[data-test-subj="ruleDetailsEditButton"]');
    expect(editButton).toBeTruthy();
  });

  it('hide edit button when user DOES NOT have permissions', async () => {
    jest.mock('../../../lib/capabilities', () => ({
      hasAllPrivilege: jest.fn(() => false),
      hasSaveRulesCapability: jest.fn(() => true),
      hasExecuteActionsCapability: jest.fn(() => true),
      hasManageApiKeysCapability: jest.fn(() => true),
    }));
    const editButton = wrapper.find('[data-test-subj="ruleDetailsEditButton"]');
    expect(editButton).toMatchObject({});
  });
});
function mockRule(overwrite = {}): Rule {
  return {
    id: '1',
    name: 'test rule',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    params: { name: 'test rule type name', description: 'siem description' },
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    consumer: 'alerts',
    notifyWhen: 'onActiveAlert',
    revision: 0,
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    monitoring: {
      run: {
        history: [
          {
            success: true,
            duration: 1000000,
            timestamp: 1234567,
          },
          {
            success: true,
            duration: 200000,
            timestamp: 1234567,
          },
          {
            success: false,
            duration: 300000,
            timestamp: 1234567,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 300000,
        },
        last_run: {
          timestamp: '2020-08-20T19:23:38Z',
          metrics: {
            duration: 500,
          },
        },
      },
    },
    ...overwrite,
  };
}
