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
import { CoreStart } from '@kbn/core/public';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../../plugin';
import { RulesPage } from '.';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import * as pluginContext from '../../hooks/use_plugin_context';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AppMountParameters } from '@kbn/core/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useLoadRuleTypes: jest.fn(),
}));

const config = {
  unsafe: {
    alertDetails: {
      apm: { enabled: false },
      logs: { enabled: false },
      metrics: { enabled: false },
      uptime: { enabled: false },
    },
  },
} as ConfigSchema;

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  config,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
  plugins: {} as ObservabilityPublicPluginsStart,
}));

const { useLoadRuleTypes } = jest.requireMock('@kbn/triggers-actions-ui-plugin/public');

describe('RulesPage with all capabilities', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
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
          [ALERTS_FEATURE_ID]: { all: true },
        },
        ruleTaskTimeout: '1m',
      },
    ];
    useLoadRuleTypes.mockReturnValue({
      ruleTypes,
      ruleTypeIndex: mockedRuleTypeIndex,
    });
    wrapper = mountWithIntl(<RulesPage />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders table of rules', async () => {
    await setup();
    const getRulesList = mockUseKibanaReturnValue.services.triggersActionsUi.getRulesList;
    expect(getRulesList).toHaveBeenCalled();
    expect(getRulesList).toHaveBeenCalledWith(
      expect.objectContaining({
        showActionFilter: false,
        showCreateRuleButton: false,
        ruleDetailsRoute: 'alerts/rules/:ruleId',
        filteredRuleTypes: ['ruleType1', 'ruleType2'],
        rulesListKey: 'observability_rulesListColumns',
        visibleColumns: [
          'ruleName',
          'ruleExecutionStatusLastDate',
          'ruleSnoozeNotify',
          'ruleExecutionStatus',
          'ruleExecutionState',
        ],
      })
    );
  });

  it('renders create rule button', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createRuleButton"]').exists()).toBeTruthy();
  });
});

describe('RulesPage with show only capability', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
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
    expect(wrapper.find('[data-test-subj="createRuleButton"]').exists()).toBeFalsy();
  });
});
