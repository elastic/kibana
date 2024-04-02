/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { render } from '@testing-library/react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import * as pluginContext from '../../hooks/use_plugin_context';
import { ObservabilityPublicPluginsStart } from '../../plugin';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { RulesPage } from './rules';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
const mockObservabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    ...mockUseKibanaReturnValue,
    services: {
      ...mockUseKibanaReturnValue.services,
      observabilityAIAssistant: mockObservabilityAIAssistant,
    },
  })),
}));

jest.mock('@kbn/observability-shared-plugin/public');

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useLoadRuleTypesQuery: jest.fn(),
}));

const useLocationMock = useLocation as jest.Mock;

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {
    setHeaderActionMenu: () => {},
  } as unknown as AppMountParameters,
  config: {
    unsafe: {
      alertDetails: {
        apm: { enabled: false },
        metrics: { enabled: false },
        uptime: { enabled: false },
        observability: { enabled: false },
      },
    },
  },
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
  plugins: {} as ObservabilityPublicPluginsStart,
}));

const { useLoadRuleTypesQuery } = jest.requireMock('@kbn/triggers-actions-ui-plugin/public');

describe('RulesPage with all capabilities', () => {
  beforeEach(() => {
    useLocationMock.mockReturnValue({ pathname: '/rules', search: '', state: '', hash: '' });
  });

  async function setup() {
    const ruleTypeIndex = new Map(
      Object.entries({
        '1': {
          enabledInLicense: true,
          id: '1',
          name: 'test rule',
          actionGroups: [{ id: 'default', name: 'Default' }],
          recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
          actionVariables: { context: [], state: [] },
          defaultActionGroupId: 'default',
          producer: ALERTING_FEATURE_ID,
          minimumLicenseRequired: 'basic',
          authorizedConsumers: {
            [ALERTING_FEATURE_ID]: { all: true },
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
            [ALERTING_FEATURE_ID]: { all: true },
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
            [ALERTING_FEATURE_ID]: { all: true },
          },
          ruleTaskTimeout: '1m',
        },
      })
    );

    useLoadRuleTypesQuery.mockReturnValue({
      ruleTypesState: {
        data: ruleTypeIndex,
      },
    });

    return render(
      <IntlProvider locale="en">
        <RulesPage />
      </IntlProvider>
    );
  }

  it('should render a page template', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('rulesPage')).toBeInTheDocument();
  });

  it('should render a RuleList ', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('rules-list')).toBeInTheDocument();
  });

  it('renders a create rule button which is not disabled', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('createRuleButton')).not.toBeDisabled();
  });
});

describe('RulesPage with show only capability', () => {
  async function setup() {
    const ruleTypeIndex = new Map(
      Object.entries({
        '1': {
          enabledInLicense: true,
          id: '1',
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
          id: '2',
          name: 'test rule ok',
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

    useLoadRuleTypesQuery.mockReturnValue({
      ruleTypesState: {
        data: ruleTypeIndex,
      },
    });

    return render(<RulesPage />);
  }

  it('renders a create rule button which is not disabled', async () => {
    const wrapper = await setup();
    expect(wrapper.getByTestId('createRuleButton')).toBeDisabled();
  });
});
