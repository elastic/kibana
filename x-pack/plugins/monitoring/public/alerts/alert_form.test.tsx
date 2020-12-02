/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { actionTypeRegistryMock } from '../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { alertTypeRegistryMock } from '../../../triggers_actions_ui/public/application/alert_type_registry.mock';
import { ValidationResult, Alert } from '../../../triggers_actions_ui/public/types';
import { AlertForm } from '../../../triggers_actions_ui/public/application/sections/alert_form/alert_form';
import { AlertsContextProvider } from '../../../triggers_actions_ui/public/application/context/alerts_context';

const ALERTS_FEATURE_ID = 'alerts';
const validationMethod = (): ValidationResult => ({ errors: {} });

const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
jest.mock('../../../triggers_actions_ui/public/application/lib/alert_api', () => ({
  loadAlertTypes: jest.fn(),
}));

describe('alert_form', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  let deps: any;
  const alertType = {
    id: 'alert-type',
    iconClass: 'test',
    name: 'test-alert',
    description: 'Testing',
    documentationUrl: 'https://...',
    validate: validationMethod,
    alertParamsExpression: () => <Fragment />,
    requiresAppContext: false,
  };

  const actionType = {
    id: 'alert-action-type',
    iconClass: '',
    selectMessage: '',
    validateConnector: validationMethod,
    validateParams: validationMethod,
    actionConnectorFields: null,
    actionParamsFields: null,
  };

  describe('alert_form edit alert', () => {
    let wrapper: ReactWrapper<any>;

    beforeEach(async () => {
      const coreStart = coreMock.createStart();
      deps = {
        toastNotifications: coreStart.notifications.toasts,
        ...coreStart,
        actionTypeRegistry,
        alertTypeRegistry,
      };

      alertTypeRegistry.list.mockReturnValue([alertType]);
      alertTypeRegistry.get.mockReturnValue(alertType);
      alertTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);

      const initialAlert = ({
        name: 'test',
        alertTypeId: alertType.id,
        params: {},
        consumer: ALERTS_FEATURE_ID,
        schedule: {
          interval: '1m',
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown) as Alert;

      wrapper = mountWithIntl(
        <AlertsContextProvider
          value={{
            reloadAlerts: () => {
              return new Promise<void>(() => {});
            },
            ...deps,
          }}
        >
          <AlertForm
            alert={initialAlert}
            dispatch={() => {}}
            errors={{ name: [], interval: [] }}
            operation="create"
          />
        </AlertsContextProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders alert name', async () => {
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', async () => {
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="selectedAlertTypeTitle"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('should update throttle value', async () => {
      const newThrottle = 17;
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle.toString() } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
    });
  });
});
