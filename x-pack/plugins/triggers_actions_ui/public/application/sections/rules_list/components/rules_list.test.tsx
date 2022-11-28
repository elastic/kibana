/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { RulesList, percentileFields } from './rules_list';
import { RuleTypeModel, ValidationResult, Percentiles } from '../../../../types';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  ALERTS_FEATURE_ID,
  parseDuration,
} from '@kbn/alerting-plugin/common';
import { getFormattedDuration, getFormattedMilliseconds } from '../../../lib/monitoring_utils';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(() => false),
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/rule_api', () => ({
  loadRulesWithKueryFilter: jest.fn(),
  loadRuleTypes: jest.fn(),
  loadRuleAggregationsWithKueryFilter: jest.fn(),
  updateAPIKey: jest.fn(),
  loadRuleTags: jest.fn(),
  bulkSnoozeRules: jest.fn(),
  bulkUnsnoozeRules: jest.fn(),
  bulkUpdateAPIKey: jest.fn(),
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));
jest.mock('../../../lib/rule_api/aggregate_kuery_filter');
jest.mock('../../../lib/rule_api/rules_kuery_filter');

jest.mock('../../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isRulesAvailable: true })),
}));
jest.mock('../../../../common/lib/config_api', () => ({
  triggersActionsUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/rules/',
  }),
}));
jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveRulesCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const ruleTags = ['a', 'b', 'c', 'd'];

const { loadRuleTypes, loadRuleTags } = jest.requireMock('../../../lib/rule_api');
const { loadRuleAggregationsWithKueryFilter } = jest.requireMock(
  '../../../lib/rule_api/aggregate_kuery_filter'
);
const { loadRulesWithKueryFilter } = jest.requireMock('../../../lib/rule_api/rules_kuery_filter');
const { loadActionTypes, loadAllActions } = jest.requireMock('../../../lib/action_connector_api');

const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const ruleType = {
  id: 'test_rule_type',
  description: 'test',
  iconClass: 'test',
  documentationUrl: null,
  validate: (): ValidationResult => {
    return { errors: {} };
  },
  ruleParamsExpression: () => null,
  requiresAppContext: false,
};
const ruleTypeFromApi = {
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
};
ruleTypeRegistry.list.mockReturnValue([ruleType]);
actionTypeRegistry.list.mockReturnValue([]);

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

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
  {
    id: '4',
    name: 'test rule error',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'error',
      lastDuration: 122000,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: {
        reason: RuleExecutionStatusErrorReasons.Unknown,
        message: 'test',
      },
    },
  },
  {
    id: '5',
    name: 'test rule license error',
    tags: [],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'error',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: {
        reason: RuleExecutionStatusErrorReasons.License,
        message: 'test',
      },
    },
  },
  {
    id: '6',
    name: 'test rule warning',
    tags: [],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'warning',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      warning: {
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        message: 'test',
      },
    },
  },
];

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
});

describe('rules_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  async function setup(editable: boolean = true) {
    loadRulesWithKueryFilter.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 4,
      data: mockedRulesData,
    });
    loadActionTypes.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
      },
      {
        id: 'test2',
        name: 'Test2',
      },
    ]);
    loadRuleTypes.mockResolvedValue([ruleTypeFromApi]);
    loadAllActions.mockResolvedValue([]);
    loadRuleAggregationsWithKueryFilter.mockResolvedValue({
      ruleEnabledStatus: { enabled: 2, disabled: 0 },
      ruleExecutionStatus: { ok: 1, active: 2, error: 3, pending: 4, unknown: 5, warning: 6 },
      ruleMutedStatus: { muted: 0, unmuted: 2 },
      ruleTags,
    });
    loadRuleTags.mockResolvedValue({
      ruleTags,
    });

    const ruleTypeMock: RuleTypeModel = {
      id: 'test_rule_type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: !editable,
    };

    ruleTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<RulesList />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadRulesWithKueryFilter).toHaveBeenCalled();
    expect(loadActionTypes).toHaveBeenCalled();
    expect(loadRuleAggregationsWithKueryFilter).toHaveBeenCalled();
  }

  it('renders table of rules', async () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers('legacy');
    await setup();
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(mockedRulesData.length);

    // Name and rule type column
    const ruleNameColumns = wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-name"]');
    expect(ruleNameColumns.length).toEqual(mockedRulesData.length);
    mockedRulesData.forEach((rule, index) => {
      expect(ruleNameColumns.at(index).text()).toEqual(`Name${rule.name}${ruleTypeFromApi.name}`);
    });

    // Tags column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-tagsPopover"]').length
    ).toEqual(mockedRulesData.length);
    // only show tags popover if tags exist on rule
    const tagsBadges = wrapper.find('EuiBadge[data-test-subj="ruleTagBadge"]');
    expect(tagsBadges.length).toEqual(
      mockedRulesData.filter((data) => data.tags.length > 0).length
    );

    // Last run column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-lastExecutionDate"]').length
    ).toEqual(mockedRulesData.length);

    // Last run tooltip
    wrapper
      .find('[data-test-subj="rulesTableCell-lastExecutionDateTooltip"]')
      .first()
      .simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runOnlyPendingTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').hostNodes().text()).toBe(
      'Start time of the last run.'
    );

    wrapper
      .find('[data-test-subj="rulesTableCell-lastExecutionDateTooltip"] EuiToolTipAnchor')
      .first()
      .simulate('mouseOut');

    // Schedule interval column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-interval"]').length
    ).toEqual(mockedRulesData.length);

    // Schedule interval tooltip
    wrapper.find('[data-test-subj="ruleInterval-config-tooltip-0"]').first().simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runOnlyPendingTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').hostNodes().text()).toBe(
      'Below configured minimum intervalRule interval of 1 second is below the minimum configured interval of 1 minute. This may impact alerting performance.'
    );

    wrapper
      .find('[data-test-subj="ruleInterval-config-tooltip-0"] EuiToolTipAnchor')
      .first()
      .simulate('mouseOut');

    // Duration column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-duration"]').length
    ).toEqual(mockedRulesData.length);
    // show warning if duration is long
    const durationWarningIcon = wrapper.find('EuiIconTip[data-test-subj="ruleDurationWarning"]');
    expect(durationWarningIcon.length).toEqual(
      mockedRulesData.filter(
        (data) => data.executionStatus.lastDuration > parseDuration(ruleTypeFromApi.ruleTaskTimeout)
      ).length
    );

    // Duration tooltip
    wrapper.find('[data-test-subj="rulesTableCell-durationTooltip"]').first().simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runOnlyPendingTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').hostNodes().text()).toBe(
      'The length of time it took for the rule to run (mm:ss).'
    );

    // Last response column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-lastResponse"]').length
    ).toEqual(mockedRulesData.length);
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-active"]').length).toEqual(1);
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-ok"]').length).toEqual(1);
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-pending"]').length).toEqual(1);
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-unknown"]').length).toEqual(0);
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-error"]').length).toEqual(2);
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-warning"]').length).toEqual(1);
    expect(wrapper.find('[data-test-subj="ruleStatus-error-tooltip"]').length).toEqual(2);
    expect(
      wrapper.find('EuiButtonEmpty[data-test-subj="ruleStatus-error-license-fix"]').length
    ).toEqual(1);

    expect(wrapper.find('[data-test-subj="rulesListAutoRefresh"]').exists()).toBeTruthy();

    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-error"]').first().text()).toEqual(
      'Error'
    );
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-error"]').last().text()).toEqual(
      'License Error'
    );

    // Status control column
    expect(wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-status"]').length).toEqual(
      mockedRulesData.length
    );

    // Monitoring column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="rulesTableCell-successRatio"]').length
    ).toEqual(mockedRulesData.length);
    const ratios = wrapper.find(
      'EuiTableRowCell[data-test-subj="rulesTableCell-successRatio"] span[data-test-subj="successRatio"]'
    );

    mockedRulesData.forEach((rule, index) => {
      if (rule.monitoring) {
        expect(ratios.at(index).text()).toEqual(
          `${rule.monitoring.execution.calculated_metrics.success_ratio * 100}%`
        );
      } else {
        expect(ratios.at(index).text()).toEqual(`N/A`);
      }
    });

    // P50 column is rendered initially
    expect(
      wrapper.find(`[data-test-subj="rulesTable-${Percentiles.P50}ColumnName"]`).exists()
    ).toBeTruthy();

    let percentiles = wrapper.find(
      `EuiTableRowCell[data-test-subj="rulesTableCell-ruleExecutionPercentile"] span[data-test-subj="rule-duration-format-value"]`
    );

    mockedRulesData.forEach((rule, index) => {
      if (typeof rule.monitoring?.execution.calculated_metrics.p50 === 'number') {
        // Ensure the table cells are getting the correct values
        expect(percentiles.at(index).text()).toEqual(
          getFormattedDuration(rule.monitoring.execution.calculated_metrics.p50)
        );
        // Ensure the tooltip is showing the correct content
        expect(
          wrapper
            .find(
              'EuiTableRowCell[data-test-subj="rulesTableCell-ruleExecutionPercentile"] [data-test-subj="rule-duration-format-tooltip"]'
            )
            .at(index)
            .props().content
        ).toEqual(getFormattedMilliseconds(rule.monitoring.execution.calculated_metrics.p50));
      } else {
        expect(percentiles.at(index).text()).toEqual('N/A');
      }
    });

    // Click column to sort by P50
    wrapper
      .find(`[data-test-subj="rulesTable-${Percentiles.P50}ColumnName"]`)
      .first()
      .simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          field: percentileFields[Percentiles.P50],
          direction: 'asc',
        },
      })
    );

    // Click column again to reverse sort by P50
    wrapper
      .find(`[data-test-subj="rulesTable-${Percentiles.P50}ColumnName"]`)
      .first()
      .simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          field: percentileFields[Percentiles.P50],
          direction: 'desc',
        },
      })
    );

    // Hover over percentile selection button
    wrapper
      .find('[data-test-subj="percentileSelectablePopover-iconButton"]')
      .first()
      .simulate('click');

    jest.runOnlyPendingTimers();
    wrapper.update();

    // Percentile Selection
    expect(
      wrapper.find('[data-test-subj="percentileSelectablePopover-selectable"]').exists()
    ).toBeTruthy();

    const percentileOptions = wrapper.find(
      '[data-test-subj="percentileSelectablePopover-selectable"] li'
    );
    expect(percentileOptions.length).toEqual(3);

    // Select P95
    percentileOptions.at(1).simulate('click');

    jest.runOnlyPendingTimers();
    wrapper.update();

    expect(
      wrapper.find(`[data-test-subj="rulesTable-${Percentiles.P95}ColumnName"]`).exists()
    ).toBeTruthy();

    percentiles = wrapper.find(
      `EuiTableRowCell[data-test-subj="rulesTableCell-ruleExecutionPercentile"] span[data-test-subj="rule-duration-format-value"]`
    );

    mockedRulesData.forEach((rule, index) => {
      if (typeof rule.monitoring?.execution.calculated_metrics.p95 === 'number') {
        expect(percentiles.at(index).text()).toEqual(
          getFormattedDuration(rule.monitoring.execution.calculated_metrics.p95)
        );
      } else {
        expect(percentiles.at(index).text()).toEqual('N/A');
      }
    });

    // Click column to sort by P95
    wrapper
      .find(`[data-test-subj="rulesTable-${Percentiles.P95}ColumnName"]`)
      .first()
      .simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          field: percentileFields[Percentiles.P95],
          direction: 'asc',
        },
      })
    );

    // Click column again to reverse sort by P95
    wrapper
      .find(`[data-test-subj="rulesTable-${Percentiles.P95}ColumnName"]`)
      .first()
      .simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          field: percentileFields[Percentiles.P95],
          direction: 'desc',
        },
      })
    );

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });

  it('renders license errors and manage license modal on click', async () => {
    global.open = jest.fn();
    await setup();
    expect(wrapper.find('ManageLicenseModal').exists()).toBeFalsy();
    expect(
      wrapper.find('EuiButtonEmpty[data-test-subj="ruleStatus-error-license-fix"]').length
    ).toEqual(1);
    wrapper.find('EuiButtonEmpty[data-test-subj="ruleStatus-error-license-fix"]').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('ManageLicenseModal').exists()).toBeTruthy();
    expect(wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').text()).toEqual(
      'Manage license'
    );
    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');
    expect(global.open).toHaveBeenCalled();
  });

  it('sorts rules when clicking the name column', async () => {
    await setup();
    wrapper
      .find('[data-test-subj="tableHeaderCell_name_1"] .euiTableHeaderButton')
      .first()
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadRulesWithKueryFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          field: 'name',
          direction: 'desc',
        },
      })
    );
  });

  it('sorts rules when clicking the status control column', async () => {
    await setup();
    wrapper
      .find('[data-test-subj="tableHeaderCell_enabled_10"] .euiTableHeaderButton')
      .first()
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: {
          field: 'enabled',
          direction: 'asc',
        },
      })
    );
  });

  it.skip('renders edit and delete buttons when user can manage rules', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="ruleSidebarEditAction"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleSidebarDeleteAction"]').exists()).toBeTruthy();
  });

  it('does not render edit and delete button when rule type does not allow editing in rules management', async () => {
    await setup(false);
    expect(wrapper.find('[data-test-subj="ruleSidebarEditAction"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="ruleSidebarDeleteAction"]').exists()).toBeTruthy();
  });

  it.skip('renders brief', async () => {
    await setup();

    // { ok: 1, active: 2, error: 3, pending: 4, unknown: 5, warning: 6 }
    expect(wrapper.find('EuiHealth[data-test-subj="totalOkRulesCount"]').text()).toEqual('Ok: 1');
    expect(wrapper.find('EuiHealth[data-test-subj="totalActiveRulesCount"]').text()).toEqual(
      'Active: 2'
    );
    expect(wrapper.find('EuiHealth[data-test-subj="totalErrorRulesCount"]').text()).toEqual(
      'Error: 3'
    );
    expect(wrapper.find('EuiHealth[data-test-subj="totalPendingRulesCount"]').text()).toEqual(
      'Pending: 4'
    );
    expect(wrapper.find('EuiHealth[data-test-subj="totalUnknownRulesCount"]').text()).toEqual(
      'Unknown: 5'
    );
    expect(wrapper.find('EuiHealth[data-test-subj="totalWarningRulesCount"]').text()).toEqual(
      'Warning: 6'
    );
  });

  it.skip('does not render the status filter if the feature flag is off', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="ruleStatusFilter"]').exists()).toBeFalsy();
  });

  it.skip('renders the status filter if the experiment is on', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    await setup();
    expect(wrapper.find('[data-test-subj="ruleStatusFilter"]').exists()).toBeTruthy();
  });

  it.skip('can filter by rule states', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    loadRulesWithKueryFilter.mockReset();
    await setup();

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleStatusesFilter: [],
      })
    );

    wrapper.find('[data-test-subj="ruleStatusFilterButton"] button').simulate('click');

    wrapper.find('[data-test-subj="ruleStatusFilterOption-enabled"]').first().simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleStatusesFilter: ['enabled'],
      })
    );

    wrapper.find('[data-test-subj="ruleStatusFilterOption-snoozed"]').first().simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleStatusesFilter: ['enabled', 'snoozed'],
      })
    );

    wrapper.find('[data-test-subj="ruleStatusFilterOption-snoozed"]').first().simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ruleStatusesFilter: ['enabled'],
      })
    );
  });

  it.skip('does not render the tag filter is the feature flag is off', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="ruleTagFilter"]').exists()).toBeFalsy();
  });

  it.skip('renders the tag filter if the experiment is on', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    await setup();
    expect(wrapper.find('[data-test-subj="ruleTagFilter"]').exists()).toBeTruthy();
  });

  it.skip('can filter by tags', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
    loadRulesWithKueryFilter.mockReset();
    await setup();

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tagsFilter: [],
      })
    );

    wrapper.find('[data-test-subj="ruleTagFilterButton"] button').simulate('click');

    const tagFilterListItems = wrapper.find(
      '[data-test-subj="ruleTagFilterSelectable"] .euiSelectableListItem'
    );
    expect(tagFilterListItems.length).toEqual(ruleTags.length);

    tagFilterListItems.at(0).simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tagsFilter: ['a'],
      })
    );

    tagFilterListItems.at(1).simulate('click');

    expect(loadRulesWithKueryFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tagsFilter: ['a', 'b'],
      })
    );
  });

  it.skip('rule list items with actions are editable if canExecuteAction is true', async () => {
    await setup();
    expect(wrapper.find('button.euiButtonIcon[disabled=true]').length).toEqual(2);
  });

  it.skip('rule list items with actions are not editable if canExecuteAction is false', async () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValue(false);
    await setup();
    expect(wrapper.find('button.euiButtonIcon[disabled=true]').length).toEqual(8);
    hasExecuteActionsCapability.mockReturnValue(true);
  });
});
