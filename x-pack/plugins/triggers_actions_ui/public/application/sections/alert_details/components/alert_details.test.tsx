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
import { EuiTitle, EuiBadge, EuiFlexItem, EuiButtonEmpty, EuiSwitch } from '@elastic/eui';
import { times, random } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

jest.mock('../../../app_context', () => ({
  useAppDependencies: jest.fn(() => ({
    http: jest.fn(),
    legacy: {
      capabilities: {
        get: jest.fn(() => ({})),
      },
    },
  })),
}));

jest.mock('../../../lib/capabilities', () => ({
  hasSaveAlertsCapability: jest.fn(() => true),
}));

const mockAlertApis = {
  muteAlert: jest.fn(),
  unmuteAlert: jest.fn(),
  enableAlert: jest.fn(),
  disableAlert: jest.fn(),
  requestRefresh: jest.fn(),
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
      actionVariables: [],
    };

    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).containsMatchingElement(
        <EuiTitle size="m">
          <h1>{alert.name}</h1>
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
      actionVariables: [],
    };

    expect(
      shallow(
        <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
      ).containsMatchingElement(<EuiBadge>{alertType.name}</EuiBadge>)
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
        actionVariables: [],
      };

      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
          enabled: true,
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
      const actionCount = random(1, 10);
      const alert = mockAlert({
        actions: [
          {
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.server-log',
          },
          ...times(actionCount, () => ({
            group: 'default',
            id: uuid.v4(),
            params: {},
            actionTypeId: '.email',
          })),
        ],
      });
      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: [],
      };
      const actionTypes: ActionType[] = [
        {
          id: '.server-log',
          name: 'Server log',
          enabled: true,
        },
        {
          id: '.email',
          name: 'Send email',
          enabled: true,
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
            <EuiBadge color="hollow">{`+${actionCount}`}</EuiBadge>
          </EuiFlexItem>
        )
      ).toBeTruthy();
    });
  });

  describe('links', () => {
    it('links to the Edit flyout', () => {
      const alert = mockAlert();

      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: [],
      };

      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
        ).containsMatchingElement(
          <EuiButtonEmpty disabled={true} iconType="pencil">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
              defaultMessage="Edit"
            />
          </EuiButtonEmpty>
        )
      ).toBeTruthy();
    });

    it('links to the app that created the alert', () => {
      const alert = mockAlert();

      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: [],
      };

      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
        ).containsMatchingElement(
          <EuiButtonEmpty disabled={true} iconType="popout">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertDetails.viewAlertInAppButtonLabel"
              defaultMessage="View in app"
            />
          </EuiButtonEmpty>
        )
      ).toBeTruthy();
    });

    it('links to the activity log', () => {
      const alert = mockAlert();

      const alertType = {
        id: '.noop',
        name: 'No Op',
        actionGroups: [{ id: 'default', name: 'Default' }],
        actionVariables: [],
      };

      expect(
        shallow(
          <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
        ).containsMatchingElement(
          <EuiButtonEmpty disabled={true} iconType="menuLeft">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertDetails.activityLogButtonLabel"
              defaultMessage="Activity Log"
            />
          </EuiButtonEmpty>
        )
      ).toBeTruthy();
    });
  });
});

describe('enable button', () => {
  it('should render an enable button when alert is enabled', () => {
    const alert = mockAlert({
      enabled: true,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: [],
    };

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

  it('should render an enable button when alert is disabled', () => {
    const alert = mockAlert({
      enabled: false,
    });

    const alertType = {
      id: '.noop',
      name: 'No Op',
      actionGroups: [{ id: 'default', name: 'Default' }],
      actionVariables: [],
    };

    const enableButton = shallow(
      <AlertDetails alert={alert} alertType={alertType} actionTypes={[]} {...mockAlertApis} />
    )
      .find(EuiSwitch)
      .find('[name="enable"]')
      .first();

    expect(enableButton.props()).toMatchObject({
      checked: false,
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
      actionVariables: [],
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
      .find('[name="enable"]')
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
      actionVariables: [],
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
      .find('[name="enable"]')
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
      actionVariables: [],
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
      actionVariables: [],
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
      actionVariables: [],
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
      actionVariables: [],
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
      actionVariables: [],
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

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
    consumer: 'consumer',
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
    ...overloads,
  };
}
