/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { ValidationResult, Alert } from '../../../types';
import { AlertForm } from './alert_form';
import { AlertsContextProvider } from '../../context/alerts_context';
import { coreMock } from 'src/core/public/mocks';
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
describe('alert_form', () => {
  let deps: any;
  const alertType = {
    id: 'my-alert-type',
    iconClass: 'test',
    name: 'test-alert',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <Fragment />,
  };

  const actionType = {
    id: 'my-action-type',
    iconClass: 'test',
    selectMessage: 'test',
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: null,
  };

  describe('alert_form create alert', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const mockes = coreMock.createSetup();
      deps = {
        toastNotifications: mockes.notifications.toasts,
        http: mockes.http,
        uiSettings: mockes.uiSettings,
        actionTypeRegistry: actionTypeRegistry as any,
        alertTypeRegistry: alertTypeRegistry as any,
        docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
      };
      alertTypeRegistry.list.mockReturnValue([alertType]);
      alertTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);

      const initialAlert = ({
        name: 'test',
        params: {},
        consumer: 'alerting',
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
            http: deps!.http,
            docLinks: deps.docLinks,
            actionTypeRegistry: deps!.actionTypeRegistry,
            alertTypeRegistry: deps!.alertTypeRegistry,
            toastNotifications: deps!.toastNotifications,
            uiSettings: deps!.uiSettings,
          }}
        >
          <AlertForm alert={initialAlert} dispatch={() => {}} errors={{ name: [], interval: [] }} />
        </AlertsContextProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders alert name', async () => {
      await setup();
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="my-alert-type-SelectOption"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders registered action types', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find(
        '[data-test-subj=".server-log-ActionTypeSelectOption"]'
      );
      expect(alertTypeSelectOptions.exists()).toBeFalsy();
    });
  });

  describe('alert_form edit alert', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const mockes = coreMock.createSetup();
      deps = {
        toastNotifications: mockes.notifications.toasts,
        http: mockes.http,
        uiSettings: mockes.uiSettings,
        actionTypeRegistry: actionTypeRegistry as any,
        alertTypeRegistry: alertTypeRegistry as any,
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
        consumer: 'alerting',
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
            http: deps!.http,
            docLinks: deps.docLinks,
            actionTypeRegistry: deps!.actionTypeRegistry,
            alertTypeRegistry: deps!.alertTypeRegistry,
            toastNotifications: deps!.toastNotifications,
            uiSettings: deps!.uiSettings,
          }}
        >
          <AlertForm alert={initialAlert} dispatch={() => {}} errors={{ name: [], interval: [] }} />
        </AlertsContextProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders alert name', async () => {
      await setup();
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="selectedAlertTypeTitle"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('should update throttle value', async () => {
      const newThrottle = 17;
      await setup();
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle.toString() } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
    });

    it('should unset throttle value', async () => {
      const newThrottle = '';
      await setup();
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
    });
  });
});
