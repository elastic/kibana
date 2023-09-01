/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { AlertsList } from './alerts_list';
import { AlertTypeModel, ValidationResult } from '../../../../types';
import {
  AlertExecutionStatusErrorReasons,
  ALERTS_FEATURE_ID,
  parseDuration,
} from '../../../../../../alerting/common';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  loadAllActions: jest.fn(),
}));
jest.mock('../../../lib/alert_api', () => ({
  loadAlerts: jest.fn(),
  loadAlertTypes: jest.fn(),
  alertingFrameworkHealth: jest.fn(() => ({
    isSufficientlySecure: true,
    hasPermanentEncryptionKey: true,
  })),
}));
jest.mock('../../../../common/lib/health_api', () => ({
  triggersActionsUiHealth: jest.fn(() => ({ isAlertsAvailable: true })),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/alerts/',
  }),
}));
jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveAlertsCapability: jest.fn(() => true),
  hasShowActionsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
const { loadAlerts, loadAlertTypes } = jest.requireMock('../../../lib/alert_api');
const { loadActionTypes, loadAllActions } = jest.requireMock('../../../lib/action_connector_api');
const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

const alertType = {
  id: 'test_alert_type',
  description: 'test',
  iconClass: 'test',
  documentationUrl: null,
  validate: (): ValidationResult => {
    return { errors: {} };
  },
  alertParamsExpression: () => null,
  requiresAppContext: false,
};
const alertTypeFromApi = {
  id: 'test_alert_type',
  name: 'some alert type',
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
ruleTypeRegistry.list.mockReturnValue([alertType]);
actionTypeRegistry.list.mockReturnValue([]);
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('alerts_list component empty', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
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
    loadAlertTypes.mockResolvedValue([alertTypeFromApi]);
    loadAllActions.mockResolvedValue([]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;

    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders empty list', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createFirstAlertEmptyPrompt"]').exists()).toBeTruthy();
  });

  it('renders Create alert button', async () => {
    await setup();
    expect(
      wrapper.find('[data-test-subj="createFirstAlertButton"]').find('EuiButton')
    ).toHaveLength(1);
    expect(wrapper.find('AlertAdd').exists()).toBeFalsy();

    wrapper.find('button[data-test-subj="createFirstAlertButton"]').simulate('click');

    await act(async () => {
      // When the AlertAdd component is rendered, it waits for the healthcheck to resolve
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('AlertAdd').exists()).toEqual(true);
  });
});

describe('alerts_list component with items', () => {
  let wrapper: ReactWrapper<any>;

  const mockedAlertsData = [
    {
      id: '1',
      name: 'test alert',
      tags: ['tag1'],
      enabled: true,
      alertTypeId: 'test_alert_type',
      schedule: { interval: '5d' },
      actions: [],
      params: { name: 'test alert type name' },
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
    },
    {
      id: '2',
      name: 'test alert ok',
      tags: ['tag1'],
      enabled: true,
      alertTypeId: 'test_alert_type',
      schedule: { interval: '5d' },
      actions: [],
      params: { name: 'test alert type name' },
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
    },
    {
      id: '3',
      name: 'test alert pending',
      tags: ['tag1'],
      enabled: true,
      alertTypeId: 'test_alert_type',
      schedule: { interval: '5d' },
      actions: [],
      params: { name: 'test alert type name' },
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
    },
    {
      id: '4',
      name: 'test alert error',
      tags: ['tag1'],
      enabled: true,
      alertTypeId: 'test_alert_type',
      schedule: { interval: '5d' },
      actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
      params: { name: 'test alert type name' },
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
          reason: AlertExecutionStatusErrorReasons.Unknown,
          message: 'test',
        },
      },
    },
    {
      id: '5',
      name: 'test alert license error',
      tags: [],
      enabled: true,
      alertTypeId: 'test_alert_type',
      schedule: { interval: '5d' },
      actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
      params: { name: 'test alert type name' },
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
          reason: AlertExecutionStatusErrorReasons.License,
          message: 'test',
        },
      },
    },
  ];

  async function setup(editable: boolean = true) {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 4,
      data: mockedAlertsData,
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
    loadAlertTypes.mockResolvedValue([alertTypeFromApi]);
    loadAllActions.mockResolvedValue([]);

    const ruleTypeMock: AlertTypeModel = {
      id: 'test_alert_type',
      iconClass: 'test',
      description: 'Alert when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      alertParamsExpression: jest.fn(),
      requiresAppContext: !editable,
    };

    ruleTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlerts).toHaveBeenCalled();
    expect(loadActionTypes).toHaveBeenCalled();
  }

  it('renders table of alerts', async () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers({ legacyFakeTimers: true });
    await setup();
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(mockedAlertsData.length);

    // Enabled switch column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-enabled"]').length
    ).toEqual(mockedAlertsData.length);

    // Name and rule type column
    const ruleNameColumns = wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-name"]');
    expect(ruleNameColumns.length).toEqual(mockedAlertsData.length);
    mockedAlertsData.forEach((rule, index) => {
      expect(ruleNameColumns.at(index).text()).toEqual(`Name${rule.name}${alertTypeFromApi.name}`);
    });

    // Tags column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-tagsPopover"]').length
    ).toEqual(mockedAlertsData.length);
    // only show tags popover if tags exist on rule
    const tagsBadges = wrapper.find('EuiBadge[data-test-subj="ruleTagsBadge"]');
    expect(tagsBadges.length).toEqual(
      mockedAlertsData.filter((data) => data.tags.length > 0).length
    );

    // Last run column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-lastExecutionDate"]').length
    ).toEqual(mockedAlertsData.length);

    // Last run tooltip
    wrapper
      .find('[data-test-subj="alertsTableCell-lastExecutionDateTooltip"]')
      .first()
      .simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runOnlyPendingTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').text()).toBe('Start time of the last execution.');

    wrapper
      .find('[data-test-subj="alertsTableCell-lastExecutionDateTooltip"]')
      .first()
      .simulate('mouseOut');

    // Schedule interval column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-interval"]').length
    ).toEqual(mockedAlertsData.length);

    // Duration column
    expect(
      wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-duration"]').length
    ).toEqual(mockedAlertsData.length);
    // show warning if duration is long
    const durationWarningIcon = wrapper.find('EuiIconTip[data-test-subj="ruleDurationWarning"]');
    expect(durationWarningIcon.length).toEqual(
      mockedAlertsData.filter(
        (data) =>
          data.executionStatus.lastDuration > parseDuration(alertTypeFromApi.ruleTaskTimeout)
      ).length
    );

    // Duration tooltip
    wrapper
      .find('[data-test-subj="alertsTableCell-durationTooltip"]')
      .first()
      .simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runOnlyPendingTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').text()).toBe(
      'The length of time it took for the rule to run.'
    );

    // Status column
    expect(wrapper.find('EuiTableRowCell[data-test-subj="alertsTableCell-status"]').length).toEqual(
      mockedAlertsData.length
    );
    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-active"]').length).toEqual(1);
    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-ok"]').length).toEqual(1);
    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-pending"]').length).toEqual(1);
    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-unknown"]').length).toEqual(0);
    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-error"]').length).toEqual(2);
    expect(wrapper.find('[data-test-subj="alertStatus-error-tooltip"]').length).toEqual(2);
    expect(
      wrapper.find('EuiButtonEmpty[data-test-subj="alertStatus-error-license-fix"]').length
    ).toEqual(1);

    expect(wrapper.find('[data-test-subj="refreshAlertsButton"]').exists()).toBeTruthy();

    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-error"]').first().text()).toEqual(
      'Error'
    );
    expect(wrapper.find('EuiHealth[data-test-subj="alertStatus-error"]').last().text()).toEqual(
      'License Error'
    );

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });

  it('loads alerts when refresh button is clicked', async () => {
    await setup();
    wrapper.find('[data-test-subj="refreshAlertsButton"]').first().simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlerts).toHaveBeenCalled();
  });

  it('renders license errors and manage license modal on click', async () => {
    global.open = jest.fn();
    await setup();
    expect(wrapper.find('ManageLicenseModal').exists()).toBeFalsy();
    expect(
      wrapper.find('EuiButtonEmpty[data-test-subj="alertStatus-error-license-fix"]').length
    ).toEqual(1);
    wrapper
      .find('EuiButtonEmpty[data-test-subj="alertStatus-error-license-fix"]')
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('ManageLicenseModal').exists()).toBeTruthy();
    expect(wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').text()).toEqual(
      'Manage license'
    );
    wrapper.find('EuiButton[data-test-subj="confirmModalConfirmButton"]').simulate('click');
    expect(global.open).toHaveBeenCalled();
  });

  it('sorts alerts when clicking the name column', async () => {
    await setup();
    wrapper
      .find('[data-test-subj="tableHeaderCell_name_1"] .euiTableHeaderButton')
      .first()
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: {
          field: 'name',
          direction: 'desc',
        },
      })
    );
  });

  it('sorts alerts when clicking the enabled column', async () => {
    await setup();
    wrapper
      .find('[data-test-subj="tableHeaderCell_enabled_0"] .euiTableHeaderButton')
      .first()
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlerts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: {
          field: 'enabled',
          direction: 'asc',
        },
      })
    );
  });

  it('renders edit and delete buttons when user can manage rules', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="alertSidebarEditAction"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="alertSidebarDeleteAction"]').exists()).toBeTruthy();
  });

  it('does not render edit and delete button when rule type does not allow editing in rules management', async () => {
    await setup(false);
    expect(wrapper.find('[data-test-subj="alertSidebarEditAction"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="alertSidebarDeleteAction"]').exists()).toBeTruthy();
  });
});

describe('alerts_list component empty with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 0,
      data: [],
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
    loadAlertTypes.mockResolvedValue([
      { id: 'test_alert_type', name: 'some alert type', authorizedConsumers: {} },
    ]);
    loadAllActions.mockResolvedValue([]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('not renders create alert button', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createAlertButton"]')).toHaveLength(0);
  });
});

describe('alerts_list with show only capability', () => {
  let wrapper: ReactWrapper<any>;

  async function setup(editable: boolean = true) {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          name: 'test alert',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
        {
          id: '2',
          name: 'test alert 2',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
      ],
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

    loadAlertTypes.mockResolvedValue([alertTypeFromApi]);
    loadAllActions.mockResolvedValue([]);

    const ruleTypeMock: AlertTypeModel = {
      id: 'test_alert_type',
      iconClass: 'test',
      description: 'Alert when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      alertParamsExpression: jest.fn(),
      requiresAppContext: !editable,
    };

    ruleTypeRegistry.has.mockReturnValue(true);
    ruleTypeRegistry.get.mockReturnValue(ruleTypeMock);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders table of alerts with edit button disabled', async () => {
    await setup(false);
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="editActionHoverButton"]')).toHaveLength(0);
  });

  it('renders table of alerts with delete button disabled', async () => {
    const { hasAllPrivilege } = jest.requireMock('../../../lib/capabilities');
    hasAllPrivilege.mockReturnValue(false);
    await setup(false);
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="deleteActionHoverButton"]')).toHaveLength(0);
  });

  it('renders table of alerts with actions menu collapsedItemActions', async () => {
    await setup(false);
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="collapsedItemActions"]').length).toBeGreaterThan(0);
  });
});

describe('alerts_list with disabled itmes', () => {
  let wrapper: ReactWrapper<any>;

  async function setup() {
    loadAlerts.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 2,
      data: [
        {
          id: '1',
          name: 'test alert',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type',
          schedule: { interval: '5d' },
          actions: [],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
        {
          id: '2',
          name: 'test alert 2',
          tags: ['tag1'],
          enabled: true,
          alertTypeId: 'test_alert_type_disabled_by_license',
          schedule: { interval: '5d' },
          actions: [{ id: 'test', group: 'alert', params: { message: 'test' } }],
          params: { name: 'test alert type name' },
          scheduledTaskId: null,
          createdBy: null,
          updatedBy: null,
          apiKeyOwner: null,
          throttle: '1m',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            error: null,
          },
        },
      ],
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

    loadAlertTypes.mockResolvedValue([
      alertTypeFromApi,
      {
        id: 'test_alert_type_disabled_by_license',
        name: 'some alert type that is not allowed',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        actionVariables: { context: [], state: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        minimumLicenseRequired: 'platinum',
        enabledInLicense: false,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: true },
        },
      },
    ]);
    loadAllActions.mockResolvedValue([]);

    ruleTypeRegistry.has.mockReturnValue(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    wrapper = mountWithIntl(<AlertsList />);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders rules list with disabled indicator if disabled due to license', async () => {
    await setup();
    expect(wrapper.find('EuiBasicTable')).toHaveLength(1);
    expect(wrapper.find('EuiTableRow')).toHaveLength(2);
    expect(wrapper.find('EuiTableRow').at(0).prop('className')).toEqual('');
    expect(wrapper.find('EuiTableRow').at(1).prop('className')).toEqual(
      'actAlertsList__tableRowDisabled'
    );
    expect(wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').length).toBe(
      1
    );
    expect(
      wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').props().type
    ).toEqual('questionInCircle');
    expect(
      wrapper.find('EuiIconTip[data-test-subj="ruleDisabledByLicenseTooltip"]').props().content
    ).toEqual('This rule type requires a Platinum license.');
  });
});
