/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { RulesPage } from '.';
import { RulesTable } from './components/rules_table';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import * as pluginContext from '../../hooks/use_plugin_context';
import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AppMountParameters } from '@kbn/core/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { RuleState } from './types';
const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('../../hooks/use_fetch_rules', () => ({
  useFetchRules: jest.fn(),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useLoadRuleTypes: jest.fn(),
}));

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  config: {
    unsafe: {
      alertingExperience: { enabled: true },
      cases: { enabled: true },
      overviewNext: { enabled: false },
      rules: { enabled: true },
    },
  },
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
}));

const { useFetchRules } = jest.requireMock('../../hooks/use_fetch_rules');
const { useLoadRuleTypes } = jest.requireMock('@kbn/triggers-actions-ui-plugin/public');

describe('empty RulesPage', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const rulesState: RuleState = {
      isLoading: false,
      data: [],
      error: null,
      totalItemCount: 0,
    };

    useLoadRuleTypes.mockReturnValue({
      ruleTypes: [
        {
          id: 'test_rule_type',
          name: 'some rule type',
          actionGroups: [{ id: 'default', name: 'Default' }],
          recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
          actionVariables: { context: [], state: [] },
          defaultActionGroupId: 'default',
          producer: ALERTS_FEATURE_ID,
          minimumLicenseRequired: 'basic',
          enabledInLicense: true,
          authorizedConsumers: {
            [ALERTS_FEATURE_ID]: { read: true, all: true },
          },
          ruleTaskTimeout: '1m',
        },
      ],
    });
    useFetchRules.mockReturnValue({ rulesState, noData: true });
    wrapper = mountWithIntl(<RulesPage />);
  }
  it('renders empty screen', async () => {
    await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find(RulesTable)).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="createFirstRuleEmptyPrompt"]').exists()).toBeTruthy();
  });
  it('renders Create rule button', async () => {
    await setup();
    expect(wrapper.find('EuiButton[data-test-subj="createFirstRuleButton"]')).toHaveLength(1);
  });
  it('renders Documentation link', async () => {
    await setup();
    expect(wrapper.find('EuiLink[data-test-subj="documentationLink"]')).toHaveLength(1);
    expect(
      wrapper.find('EuiLink[data-test-subj="documentationLink"]').getElement().props.href
    ).toContain('create-alerts.html');
  });
});

describe('empty RulesPage with show only capability', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const rulesState: RuleState = {
      isLoading: false,
      data: [],
      error: null,
      totalItemCount: 0,
    };
    const ruleTypes = [
      {
        id: 'test_rule_type',
        name: 'some rule type',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        actionVariables: { context: [], state: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: false },
        },
        ruleTaskTimeout: '1m',
      },
    ];
    useFetchRules.mockReturnValue({ rulesState, noData: true });
    useLoadRuleTypes.mockReturnValue({ ruleTypes });

    wrapper = mountWithIntl(<RulesPage />);
  }

  it('renders no permission screen', async () => {
    await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="noPermissionPrompt"]').exists()).toBeTruthy();
  });

  it('does not render no data screen', async () => {
    await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="createFirstRuleEmptyPrompt"]').exists()).toBeFalsy();
  });
});

describe('RulesPage with items', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const mockedRulesData = [
      {
        id: '1',
        name: 'test rule',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '1s' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'active',
          lastDuration: 500,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 1000000,
              },
              {
                success: true,
                duration: 200000,
              },
              {
                success: false,
                duration: 300000,
              },
            ],
            calculated_metrics: {
              success_ratio: 0.66,
              p50: 200000,
              p95: 300000,
              p99: 300000,
            },
          },
        },
      },
      {
        id: '2',
        name: 'test rule ok',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'ok',
          lastDuration: 61000,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 100000,
              },
              {
                success: true,
                duration: 500000,
              },
            ],
            calculated_metrics: {
              success_ratio: 1,
              p50: 0,
              p95: 100000,
              p99: 500000,
            },
          },
        },
      },
      {
        id: '3',
        name: 'test rule pending',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastDuration: 30234,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [{ success: false, duration: 100 }],
            calculated_metrics: {
              success_ratio: 0,
            },
          },
        },
      },
    ];

    const rulesState: RuleState = {
      isLoading: false,
      data: mockedRulesData,
      error: null,
      totalItemCount: 3,
    };

    const mockedRuleTypeIndex = new Map(
      Object.entries({
        '1': {
          enabledInLicense: true,
          id: '1',
          name: 'test rule',
        },
        '2': {
          enabledInLicense: true,
          id: '2',
          name: 'test rule ok',
        },
        '3': {
          enabledInLicense: true,
          id: '3',
          name: 'test rule pending',
        },
      })
    );
    const ruleTypes = [
      {
        id: 'test_rule_type',
        name: 'some rule type',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        actionVariables: { context: [], state: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: false },
        },
        ruleTaskTimeout: '1m',
      },
    ];
    useLoadRuleTypes.mockReturnValue({
      ruleTypes,
      ruleTypeIndex: mockedRuleTypeIndex,
    });
    useFetchRules.mockReturnValue({ rulesState });
    wrapper = mountWithIntl(<RulesPage />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders table of rules', async () => {
    await setup();
    expect(wrapper.find(RulesTable)).toHaveLength(1);
  });
});

describe('RulesPage with items and show only capability', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const mockedRulesData = [
      {
        id: '1',
        name: 'test rule',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '1s' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'active',
          lastDuration: 500,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 1000000,
              },
              {
                success: true,
                duration: 200000,
              },
              {
                success: false,
                duration: 300000,
              },
            ],
            calculated_metrics: {
              success_ratio: 0.66,
              p50: 200000,
              p95: 300000,
              p99: 300000,
            },
          },
        },
      },
      {
        id: '2',
        name: 'test rule ok',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'ok',
          lastDuration: 61000,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 100000,
              },
              {
                success: true,
                duration: 500000,
              },
            ],
            calculated_metrics: {
              success_ratio: 1,
              p50: 0,
              p95: 100000,
              p99: 500000,
            },
          },
        },
      },
      {
        id: '3',
        name: 'test rule pending',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastDuration: 30234,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [{ success: false, duration: 100 }],
            calculated_metrics: {
              success_ratio: 0,
            },
          },
        },
      },
    ];
    const rulesState: RuleState = {
      isLoading: false,
      data: mockedRulesData,
      error: null,
      totalItemCount: 3,
    };
    useFetchRules.mockReturnValue({ rulesState });

    const mockedRuleTypeIndex = new Map(
      Object.entries({
        '1': {
          enabledInLicense: true,
          id: '1',
          name: 'test rule',
        },
        '2': {
          enabledInLicense: true,
          id: '2',
          name: 'test rule ok',
        },
        '3': {
          enabledInLicense: true,
          id: '3',
          name: 'test rule pending',
        },
      })
    );
    const ruleTypes = [
      {
        id: 'test_rule_type',
        name: 'some rule type',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        actionVariables: { context: [], state: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: false },
        },
        ruleTaskTimeout: '1m',
      },
    ];
    useLoadRuleTypes.mockReturnValue({ ruleTypes, ruleTypeIndex: mockedRuleTypeIndex });

    wrapper = mountWithIntl(<RulesPage />);
  }

  it('does not render create rule button', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createRuleButton"]')).toHaveLength(0);
  });
});
