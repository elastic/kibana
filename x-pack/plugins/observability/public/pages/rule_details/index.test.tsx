/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { CoreStart } from '@kbn/core/public';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../../plugin';
import { RuleDetailsPage } from '.';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import * as pluginContext from '../../hooks/use_plugin_context';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AppMountParameters } from '@kbn/core/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';

interface SetupProps {
  ruleLoading: boolean;
  ruleError: boolean;
  ruleLoaded: boolean;
  ruleEditable: boolean;
}

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
const mockRuleId = 'mock-rule-id';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(() => ({ ruleId: mockRuleId })),
  useLocation: jest.fn(() => ({ search: '123' })),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useLoadRuleTypes: jest.fn(),
}));

jest.mock('../../hooks/use_fetch_rule', () => ({
  useFetchRule: jest.fn(),
}));

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  useIsRuleEditable: jest.fn(),
}));

jest.mock('../../hooks/use_get_filtered_rule_types', () => ({
  useGetFilteredRuleTypes: jest.fn(() => ['123']),
}));

jest.mock('../../hooks/use_get_rule_type_definition_from_rule_type', () => ({
  useGetRuleTypeDefinitionFromRuleType: jest.fn(),
}));

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  config: {} as unknown as ConfigSchema,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
  core: {} as CoreStart,
  plugins: {} as ObservabilityPublicPluginsStart,
}));

const { useFetchRule } = jest.requireMock('../../hooks/use_fetch_rule');
const { useGetRuleTypeDefinitionFromRuleType } = jest.requireMock(
  '../../hooks/use_get_rule_type_definition_from_rule_type'
);
const { useIsRuleEditable } = jest.requireMock('./utils');

describe('RulesDetailPage', () => {
  async function setup({ ruleLoading, ruleError, ruleLoaded, ruleEditable }: SetupProps) {
    const mockRuleType = {
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      actionVariables: {
        context: [],
        state: [],
      },
      authorizedConsumers: {
        [ALERTS_FEATURE_ID]: {
          all: true,
        },
      },
      defaultActionGroupId: 'default',
      enabledInLicense: true,
      executionStatus: {
        status: 'active',
      },
      id: 'test_rule_type',
      minimumLicenseRequired: 'basic',
      name: 'some rule type',
      producer: ALERTS_FEATURE_ID,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      ruleTaskTimeout: '1m',
      tags: [],
    };

    const mockRule = {
      ruleTypeId: 'metrics.alert.threshold',
      createdBy: 'admin',
      updatedBy: 'admin',
      createdAt: '2022-11-21T13:21:10.555Z',
      updatedAt: '2022-11-21T13:21:10.555Z',
      apiKeyOwner: 'admin',
      notifyWhen: 'onActionGroupChange',
      muteAll: false,
      mutedInstanceIds: [],
      snoozeSchedule: [],
      executionStatus: {
        lastExecutionDate: '2022-11-22T11:35:37.219Z',
        lastDuration: 4190,
        status: 'active',
      },
      actions: [],
      scheduledTaskId: '5c0177b0-699f-11ed-8e77-89558ff3f691',
      isSnoozedUntil: null,
      lastRun: {
        outcomeMsg: null,
        alertsCount: {
          new: 0,
          ignored: 0,
          recovered: 0,
          active: 1,
        },
        warning: null,
        outcome: 'succeeded',
      },
      nextRun: '2022-11-22T11:36:36.983Z',
      id: '5c0177b0-699f-11ed-8e77-89558ff3f691',
      consumer: 'alerts',
      tags: [],
      name: 'foo',
      enabled: true,
      throttle: null,
      schedule: {
        interval: '1m',
      },
      params: {
        criteria: [
          {
            aggType: 'avg',
            comparator: '>',
            threshold: [2],
            timeSize: 1,
            timeUnit: 'm',
            metric: '_score',
          },
        ],
        sourceId: 'default',
        alertOnNoData: true,
        alertOnGroupDisappear: true,
      },
      monitoring: {
        run: {
          last_run: {
            timestamp: '2022-11-22T11:35:37.219Z',
            metrics: {
              total_search_duration_ms: null,
              total_indexing_duration_ms: null,
              total_alerts_detected: null,
              total_alerts_created: null,
              gap_duration_s: null,
              duration: 4190,
            },
          },
          history: [],
          calculated_metrics: {
            success_ratio: 0.9936708860759493,
            p99: 5367.439999999997,
            p50: 4182,
            p95: 5019,
          },
        },
      },
    };

    useFetchRule.mockReturnValue({
      rule: ruleError || ruleLoading || !ruleLoaded ? undefined : mockRule,
      isRuleLoading: ruleLoading,
      errorRule: ruleError ? 'error loading rule' : undefined,
      reloadRule: jest.fn(),
    });

    useGetRuleTypeDefinitionFromRuleType.mockReturnValue(mockRuleType);

    useIsRuleEditable.mockReturnValue(ruleEditable);

    return render(<RuleDetailsPage />);
  }

  describe('when a rule is loading', () => {
    it('should render a loader', async () => {
      const wrapper = await setup({
        ruleLoading: true,
        ruleError: false,
        ruleLoaded: false,
        ruleEditable: false,
      });

      expect(wrapper.getByTestId('centerJustifiedSpinner')).toBeInTheDocument();
    });
  });

  const ruleLoadedUnsuccessfully = {
    ruleLoading: false,
    ruleError: true,
    ruleLoaded: false,
    ruleEditable: false,
  };
  describe('when loading a rule has errored', () => {
    it('should render an error state', async () => {
      const wrapper = await setup(ruleLoadedUnsuccessfully);

      expect(wrapper.getByTestId('rule-loading-error')).toBeInTheDocument();
    });
  });

  const ruleLoadedSuccesfully = {
    ruleLoading: false,
    ruleError: false,
    ruleLoaded: true,
    ruleEditable: true,
  };

  describe('when a rule has been loaded', () => {
    it('should render a page template', async () => {
      const wrapper = await setup(ruleLoadedSuccesfully);
      expect(wrapper.getByTestId('ruleDetails')).toBeInTheDocument();
    });

    it('should render header actions when the rule is editable', async () => {
      const wrapperRuleNonEditable = await setup({ ...ruleLoadedSuccesfully, ruleEditable: false });
      expect(wrapperRuleNonEditable.queryByTestId('actions')).toBeNull();

      const wrapperRuleEditable = await setup(ruleLoadedSuccesfully);
      expect(wrapperRuleEditable.queryByTestId('actions')).toBeInTheDocument();
    });

    it('should render a DeleteConfirmationModal when deleting a rule', async () => {
      const wrapper = await setup(ruleLoadedSuccesfully);

      fireEvent.click(wrapper.getByTestId('actions'));
      fireEvent.click(wrapper.getByTestId('deleteRuleButton'));

      expect(wrapper.getByTestId('deleteIdsConfirmation')).toBeInTheDocument();
    });

    it('should render RuleDetailTabs', async () => {
      const wrapper = await setup(ruleLoadedSuccesfully);
      expect(wrapper.getByTestId('rule-detail-tabs')).toBeInTheDocument();
    });

    it('should render a RuleStatusPanel', async () => {
      const wrapper = await setup(ruleLoadedSuccesfully);
      expect(wrapper.getByTestId('rule-status-panel')).toBeInTheDocument();
    });

    it('should render an EditAlertFlyout', async () => {
      const wrapper = await setup(ruleLoadedSuccesfully);

      fireEvent.click(wrapper.getByTestId('actions'));
      fireEvent.click(wrapper.getByTestId('editRuleButton'));

      expect(wrapper.getByTestId('edit-alert-flyout')).toBeInTheDocument();
    });
  });
});
