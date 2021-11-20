/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from '@testing-library/react';
import { AlertDetails } from './alert_details';
import { Alert, ActionType, AlertTypeModel, AlertType } from '../../../../types';
import {
  EuiBadge,
  EuiFlexItem,
  EuiSwitch,
  EuiButtonEmpty,
  EuiText,
  EuiPageHeaderProps,
} from '@elastic/eui';
import {
  ActionGroup,
  AlertExecutionStatusErrorReasons,
  ALERTS_FEATURE_ID,
} from '../../../../../../alerting/common';
import { useKibana } from '../../../../common/lib/kibana';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
  useLocation: () => ({
    pathname: '/triggersActions/alerts/',
  }),
}));

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../lib/capabilities', () => ({
  hasAllPrivilege: jest.fn(() => true),
  hasSaveAlertsCapability: jest.fn(() => true),
  hasExecuteActionsCapability: jest.fn(() => true),
}));
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const ruleTypeRegistry = ruleTypeRegistryMock.create();

const mockAlertApis = {
  muteAlert: jest.fn(),
  unmuteAlert: jest.fn(),
  enableAlert: jest.fn(),
  disableAlert: jest.fn(),
  requestRefresh: jest.fn(),
};

const authorizedConsumers = {
  [ALERTS_FEATURE_ID]: { read: true, all: true },
};
const recoveryActionGroup: ActionGroup<'recovered'> = { id: 'recovered', name: 'Recovered' };

const alertType: AlertType = {
  id: '.noop',
  name: 'No Op',
  actionGroups: [{ id: 'default', name: 'Default' }],
  recoveryActionGroup,
  actionVariables: { context: [], state: [], params: [] },
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  producer: ALERTS_FEATURE_ID,
  authorizedConsumers,
  enabledInLicense: true,
};

describe('alert_details', () => {
  it('renders the alert name as a title', () => {
    const alert = mockAlert();
    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).find('EuiPageHeader')
    ).toBeTruthy();
  });

  it('renders the alert type badge', () => {
    const alert = mockAlert();
    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).find(<EuiBadge>{alertType.name}</EuiBadge>)
    ).toBeTruthy();
  });

  it('renders the alert error banner with error message, when alert status is an error', () => {
    const alert = mockAlert({
      executionStatus: {
        status: 'error',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        error: {
          reason: AlertExecutionStatusErrorReasons.Unknown,
          message: 'test',
        },
      },
    });
    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).containsMatchingElement(
        <EuiText size="s" color="danger" data-test-subj="alertErrorMessageText">
          {'test'}
        </EuiText>
      )
    ).toBeTruthy();
  });

  describe('actions', () => {
    it('renders an alert action', () => {
      const alert = mockAlert({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
        ],
      });

      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      expect(
        shallow(
          <AlertDetails
            alert={alert}
            alertType={alertType}
            actionTypes={actionTypes}
            {...mockAlertApis}
          />
        ).containsMatchingElement(
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{actionTypes[0].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });

    it('renders a counter for multiple alert action', () => {
      const alert = mockAlert({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.email',
          },
        ],
      });
      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
        {
          id: '.email',
          name: 'Send email',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
        },
      ];

      const details = shallow(
        <AlertDetails
          alert={alert}
          alertType={alertType}
          actionTypes={actionTypes}
          {...mockAlertApis}
        />
      );

      expect(
        details.containsMatchingElement(
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{actionTypes[0].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();

      expect(
        details.containsMatchingElement(
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{actionTypes[1].name}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });
  });

  describe('links', () => {
    it('links to the app that created the alert', () => {
      const alert = mockAlert();
      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
        ).find('ViewInApp')
      ).toBeTruthy();
    });

    it('links to the Edit flyout', () => {
      const alert = mockAlert();
      const pageHeaderProps = shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      )
        .find('EuiPageHeader')
        .props() as EuiPageHeaderProps;
      const rightSideItems = pageHeaderProps.rightSideItems;
      expect(!!rightSideItems && rightSideItems[2]!).toMatchInlineSnapshot(`
        <React.Fragment>
          <EuiButtonEmpty
            data-test-subj="openEditAlertFlyoutButton"
            disabled={false}
            iconType="pencil"
            name="edit"
            onClick={[Function]}
          >
            <FormattedMessage
              defaultMessage="Edit"
              id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
              values={Object {}}
            />
          </EuiButtonEmpty>
        </React.Fragment>
      `);
    });
  });
});

describe('disable button', () => {
  it('should render a disable button when alert is enabled', () => {
    const alert = mockAlert({
      enabled: true,
    });
    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="enable"]')
      .first();

    expect(enableButton.props()).toMatchObject({
      checked: true,
      disabled: false,
    });
  });

  it('should render a enable button and empty state when alert is disabled', async () => {
    const alert = mockAlert({
      enabled: false,
    });
    const wrapper = mountWithIntl(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const enableButton = wrapper.find(EuiSwitch).find('[name="enable"]').first();
    const disabledEmptyPrompt = wrapper.find('[data-test-subj="disabledEmptyPrompt"]');
    const disabledEmptyPromptAction = wrapper.find('[data-test-subj="disabledEmptyPromptAction"]');

    expect(enableButton.props()).toMatchObject({
      checked: false,
      disabled: false,
    });
    expect(disabledEmptyPrompt.exists()).toBeTruthy();
    expect(disabledEmptyPromptAction.exists()).toBeTruthy();

    disabledEmptyPromptAction.first().simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(mockAlertApis.enableAlert).toHaveBeenCalledTimes(1);
  });

  it('should disable the alert when alert is enabled and button is clicked', () => {
    const alert = mockAlert({
      enabled: true,
    });
    const disableAlert = jest.fn();
    const enableButton = shallow(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        disableAlert={disableAlert}
      />
    )
      .find(EuiSwitch)
      .find('[name="enable"]')
      .first();

    enableButton.simulate('click');
    const handler = enableButton.prop('onChange');
    expect(typeof handler).toEqual('function');
    expect(disableAlert).toHaveBeenCalledTimes(0);
    handler!({} as React.FormEvent);
    expect(disableAlert).toHaveBeenCalledTimes(1);
  });

  it('should enable the alert when alert is disabled and button is clicked', () => {
    const alert = mockAlert({
      enabled: false,
    });
    const enableAlert = jest.fn();
    const enableButton = shallow(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        enableAlert={enableAlert}
      />
    )
      .find(EuiSwitch)
      .find('[name="enable"]')
      .first();

    enableButton.simulate('click');
    const handler = enableButton.prop('onChange');
    expect(typeof handler).toEqual('function');
    expect(enableAlert).toHaveBeenCalledTimes(0);
    handler!({} as React.FormEvent);
    expect(enableAlert).toHaveBeenCalledTimes(1);
  });

  it('should reset error banner dismissal after re-enabling the alert', async () => {
    const alert = mockAlert({
      enabled: true,
      executionStatus: {
        status: 'error',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        error: {
          reason: AlertExecutionStatusErrorReasons.Execute,
          message: 'Fail',
        },
      },
    });

    const disableAlert = jest.fn();
    const enableAlert = jest.fn();
    const wrapper = mountWithIntl(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        disableAlert={disableAlert}
        enableAlert={enableAlert}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Dismiss the error banner
    await act(async () => {
      wrapper.find('[data-test-subj="dismiss-execution-error"]').first().simulate('click');
      await nextTick();
    });

    // Disable the alert
    await act(async () => {
      wrapper.find('[data-test-subj="enableSwitch"] .euiSwitch__button').first().simulate('click');
      await nextTick();
    });
    expect(disableAlert).toHaveBeenCalled();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Enable the alert
    await act(async () => {
      wrapper.find('[data-test-subj="enableSwitch"] .euiSwitch__button').first().simulate('click');
      await nextTick();
    });
    expect(enableAlert).toHaveBeenCalled();

    // Ensure error banner is back
    expect(wrapper.find('[data-test-subj="dismiss-execution-error"]').length).toBeGreaterThan(0);
  });

  it('should show the loading spinner when the rule enabled switch was clicked and the server responded with some delay', async () => {
    const alert = mockAlert({
      enabled: true,
      executionStatus: {
        status: 'error',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
        error: {
          reason: AlertExecutionStatusErrorReasons.Execute,
          message: 'Fail',
        },
      },
    });

    const disableAlert = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    });
    const enableAlert = jest.fn();
    const wrapper = mountWithIntl(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        disableAlert={disableAlert}
        enableAlert={enableAlert}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Dismiss the error banner
    await act(async () => {
      wrapper.find('[data-test-subj="dismiss-execution-error"]').first().simulate('click');
      await nextTick();
    });

    // Disable the alert
    await act(async () => {
      wrapper.find('[data-test-subj="enableSwitch"] .euiSwitch__button').first().simulate('click');
      await nextTick();
    });
    expect(disableAlert).toHaveBeenCalled();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Enable the alert
    await act(async () => {
      expect(wrapper.find('[data-test-subj="enableSpinner"]').length).toBeGreaterThan(0);
      await nextTick();
    });
  });
});

describe('mute button', () => {
  it('should render an mute button when alert is enabled', () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
    });
    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="mute"]')
      .first();
    expect(enableButton.props()).toMatchObject({
      checked: false,
      disabled: false,
    });
  });

  it('should render an muted button when alert is muted', () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: true,
    });
    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="mute"]')
      .first();
    expect(enableButton.props()).toMatchObject({
      checked: true,
      disabled: false,
    });
  });

  it('should mute the alert when alert is unmuted and button is clicked', () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
    });
    const muteAlert = jest.fn();
    const enableButton = shallow(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        muteAlert={muteAlert}
      />
    )
      .find(EuiSwitch)
      .find('[name="mute"]')
      .first();
    enableButton.simulate('click');
    const handler = enableButton.prop('onChange');
    expect(typeof handler).toEqual('function');
    expect(muteAlert).toHaveBeenCalledTimes(0);
    handler!({} as React.FormEvent);
    expect(muteAlert).toHaveBeenCalledTimes(1);
  });

  it('should unmute the alert when alert is muted and button is clicked', () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: true,
    });
    const unmuteAlert = jest.fn();
    const enableButton = shallow(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        unmuteAlert={unmuteAlert}
      />
    )
      .find(EuiSwitch)
      .find('[name="mute"]')
      .first();
    enableButton.simulate('click');
    const handler = enableButton.prop('onChange');
    expect(typeof handler).toEqual('function');
    expect(unmuteAlert).toHaveBeenCalledTimes(0);
    handler!({} as React.FormEvent);
    expect(unmuteAlert).toHaveBeenCalledTimes(1);
  });

  it('should disabled mute button when alert is disabled', () => {
    const alert = mockAlert({
      enabled: false,
      muteAll: false,
    });
    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="mute"]')
      .first();
    expect(enableButton.props()).toMatchObject({
      checked: false,
      disabled: true,
    });
  });
});

describe('edit button', () => {
  const actionTypes: ActionType[] = [
    {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
  ];
  ruleTypeRegistry.has.mockReturnValue(true);
  const alertTypeR: AlertTypeModel = {
    id: 'my-alert-type',
    iconClass: 'test',
    description: 'Alert when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: () => {
      return { errors: {} };
    },
    alertParamsExpression: jest.fn(),
    requiresAppContext: false,
  };
  ruleTypeRegistry.get.mockReturnValue(alertTypeR);
  useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;

  it('should render an edit button when alert and actions are editable', () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: uuid.v4(),
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const pageHeaderProps = shallow(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        {...mockAlertApis}
      />
    )
      .find('EuiPageHeader')
      .props() as EuiPageHeaderProps;
    const rightSideItems = pageHeaderProps.rightSideItems;
    expect(!!rightSideItems && rightSideItems[2]!).toMatchInlineSnapshot(`
      <React.Fragment>
        <EuiButtonEmpty
          data-test-subj="openEditAlertFlyoutButton"
          disabled={false}
          iconType="pencil"
          name="edit"
          onClick={[Function]}
        >
          <FormattedMessage
            defaultMessage="Edit"
            id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
            values={Object {}}
          />
        </EuiButtonEmpty>
      </React.Fragment>
    `);
  });

  it('should not render an edit button when alert editable but actions arent', () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValueOnce(false);
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: uuid.v4(),
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    expect(
      shallow(
        <AlertDetails
          alert={alert}
          alertType={alertType}
          actionTypes={actionTypes}
          {...mockAlertApis}
        />
      )
        .find(EuiButtonEmpty)
        .find('[name="edit"]')
        .first()
        .exists()
    ).toBeFalsy();
  });

  it('should render an edit button when alert editable but actions arent when there are no actions on the alert', async () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValueOnce(false);
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [],
    });
    const pageHeaderProps = shallow(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        {...mockAlertApis}
      />
    )
      .find('EuiPageHeader')
      .props() as EuiPageHeaderProps;
    const rightSideItems = pageHeaderProps.rightSideItems;
    expect(!!rightSideItems && rightSideItems[2]!).toMatchInlineSnapshot(`
      <React.Fragment>
        <EuiButtonEmpty
          data-test-subj="openEditAlertFlyoutButton"
          disabled={false}
          iconType="pencil"
          name="edit"
          onClick={[Function]}
        >
          <FormattedMessage
            defaultMessage="Edit"
            id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
            values={Object {}}
          />
        </EuiButtonEmpty>
      </React.Fragment>
    `);
  });
});

describe('broken connector indicator', () => {
  const actionTypes: ActionType[] = [
    {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
  ];
  ruleTypeRegistry.has.mockReturnValue(true);
  const alertTypeR: AlertTypeModel = {
    id: 'my-alert-type',
    iconClass: 'test',
    description: 'Alert when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: () => {
      return { errors: {} };
    },
    alertParamsExpression: jest.fn(),
    requiresAppContext: false,
  };
  ruleTypeRegistry.get.mockReturnValue(alertTypeR);
  useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
  const { loadAllActions } = jest.requireMock('../../../lib/action_connector_api');
  loadAllActions.mockResolvedValue([
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'connector-id-1',
      actionTypeId: '.server-log',
      name: 'Test connector',
      config: {},
      isPreconfigured: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'connector-id-2',
      actionTypeId: '.server-log',
      name: 'Test connector 2',
      config: {},
      isPreconfigured: false,
    },
  ]);

  it('should not render broken connector indicator or warning if all rule actions connectors exist', async () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: 'connector-id-1',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-2',
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const wrapper = mountWithIntl(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        {...mockAlertApis}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const brokenConnectorIndicator = wrapper
      .find('[data-test-subj="actionWithBrokenConnector"]')
      .first();
    const brokenConnectorWarningBanner = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
      .first();
    expect(brokenConnectorIndicator.exists()).toBeFalsy();
    expect(brokenConnectorWarningBanner.exists()).toBeFalsy();
  });

  it('should render broken connector indicator and warning if any rule actions connector does not exist', async () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: 'connector-id-1',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-2',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-doesnt-exist',
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const wrapper = mountWithIntl(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        {...mockAlertApis}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const brokenConnectorIndicator = wrapper
      .find('[data-test-subj="actionWithBrokenConnector"]')
      .first();
    const brokenConnectorWarningBanner = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
      .first();
    const brokenConnectorWarningBannerAction = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBannerEdit"]')
      .first();
    expect(brokenConnectorIndicator.exists()).toBeTruthy();
    expect(brokenConnectorWarningBanner.exists()).toBeTruthy();
    expect(brokenConnectorWarningBannerAction.exists()).toBeTruthy();
  });

  it('should render broken connector indicator and warning with no edit button if any rule actions connector does not exist and user has no edit access', async () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [
        {
          group: 'default',
          id: 'connector-id-1',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-2',
          params: {},
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: 'connector-id-doesnt-exist',
          params: {},
          actionTypeId: '.server-log',
        },
      ],
    });
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValue(false);
    const wrapper = mountWithIntl(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={actionTypes}
        {...mockAlertApis}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const brokenConnectorIndicator = wrapper
      .find('[data-test-subj="actionWithBrokenConnector"]')
      .first();
    const brokenConnectorWarningBanner = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBanner"]')
      .first();
    const brokenConnectorWarningBannerAction = wrapper
      .find('[data-test-subj="actionWithBrokenConnectorWarningBannerEdit"]')
      .first();
    expect(brokenConnectorIndicator.exists()).toBeTruthy();
    expect(brokenConnectorWarningBanner.exists()).toBeTruthy();
    expect(brokenConnectorWarningBannerAction.exists()).toBeFalsy();
  });
});

describe('refresh button', () => {
  it('should call requestRefresh when clicked', async () => {
    const alert = mockAlert();
    const requestRefresh = jest.fn();
    const wrapper = mountWithIntl(
      <AlertDetails
        alert={alert}
        alertType={alertType}
        actionTypes={[]}
        {...mockAlertApis}
        requestRefresh={requestRefresh}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const refreshButton = wrapper.find('[data-test-subj="refreshAlertsButton"]').first();
    expect(refreshButton.exists()).toBeTruthy();

    refreshButton.simulate('click');
    expect(requestRefresh).toHaveBeenCalledTimes(1);
  });
});

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
    consumer: ALERTS_FEATURE_ID,
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
