/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { AlertDetails } from './alert_details';
import { Alert, ActionType } from '../../../../types';
import { EuiTitle, EuiBadge, EuiFlexItem, EuiSwitch, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { ViewInApp } from './view_in_app';
import {
  AlertExecutionStatusErrorReasons,
  ALERTS_FEATURE_ID,
} from '../../../../../../alerts/common';
jest.mock('../../../../common/lib/kibana');

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
  hasExecuteActionsCapability: jest.fn(() => true),
}));

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

// const AlertDetails = withBulkAlertOperations(RawAlertDetails);
describe('alert_details', () => {
  // mock Api handlers

  it('renders the alert name as a title', () => {
    const alert = mockAlert();
    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).containsMatchingElement(
        <EuiTitle size="m">
          <h1>
            <span>{alert.name}</span>
          </h1>
        </EuiTitle>
      )
    ).toBeTruthy();
  });

  it('renders the alert type badge', () => {
    const alert = mockAlert();
    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).containsMatchingElement(<EuiBadge>{alertType.name}</EuiBadge>)
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
    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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

      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: { context: [], state: [], params: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers,
      };

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
      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: { context: [], state: [], params: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers,
      };
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

      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: { context: [], state: [], params: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers,
      };

      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
        ).containsMatchingElement(<ViewInApp alert={alert} />)
      ).toBeTruthy();
    });

    it('links to the Edit flyout', () => {
      const alert = mockAlert();

      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: { context: [], state: [], params: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        authorizedConsumers,
      };

      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
        )
          .find(EuiButtonEmpty)
          .find('[data-test-subj="openEditAlertFlyoutButton"]')
          .first()
          .exists()
      ).toBeTruthy();
    });
  });
});

describe('disable button', () => {
  it('should render a disable button when alert is enabled', () => {
    const alert = mockAlert({
      enabled: true,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="disable"]')
      .first();

    expect(enableButton.props()).toMatchObject({
      checked: false,
      disabled: false,
    });
  });

  it('should render a disable button when alert is disabled', () => {
    const alert = mockAlert({
      enabled: false,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="disable"]')
      .first();

    expect(enableButton.props()).toMatchObject({
      checked: true,
      disabled: false,
    });
  });

  it('should enable the alert when alert is disabled and button is clicked', () => {
    const alert = mockAlert({
      enabled: true,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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
      .find('[name="disable"]')
      .first();

    enableButton.simulate('click');
    const handler = enableButton.prop('onChange');
    expect(typeof handler).toEqual('function');
    expect(disableAlert).toHaveBeenCalledTimes(0);
    handler!({} as React.FormEvent);
    expect(disableAlert).toHaveBeenCalledTimes(1);
  });

  it('should disable the alert when alert is enabled and button is clicked', () => {
    const alert = mockAlert({
      enabled: false,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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
      .find('[name="disable"]')
      .first();

    enableButton.simulate('click');
    const handler = enableButton.prop('onChange');
    expect(typeof handler).toEqual('function');
    expect(enableAlert).toHaveBeenCalledTimes(0);
    handler!({} as React.FormEvent);
    expect(enableAlert).toHaveBeenCalledTimes(1);
  });
});

describe('mute button', () => {
  it('should render an mute button when alert is enabled', () => {
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: ALERTS_FEATURE_ID,
      authorizedConsumers,
    };

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

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: 'alerting',
      authorizedConsumers,
    };

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
    ).toBeTruthy();
  });

  it('should not render an edit button when alert editable but actions arent', () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValue(false);
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

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: 'alerting',
      authorizedConsumers,
    };

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

  it('should render an edit button when alert editable but actions arent when there are no actions on the alert', () => {
    const { hasExecuteActionsCapability } = jest.requireMock('../../../lib/capabilities');
    hasExecuteActionsCapability.mockReturnValue(false);
    const alert = mockAlert({
      enabled: true,
      muteAll: false,
      actions: [],
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: { context: [], state: [], params: [] },
      defaultActionGroupId: 'default',
      producer: 'alerting',
      authorizedConsumers,
    };

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
    ).toBeTruthy();
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
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
