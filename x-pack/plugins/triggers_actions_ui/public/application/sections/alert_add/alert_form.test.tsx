/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { ValidationResult, Alert } from '../../../types';
import { AlertForm } from './alert_form';
import { AppDeps } from '../../app';
import { chartPluginMock } from '../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { AlertsContextProvider } from '../../context/alerts_context';
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
describe('alert_form', () => {
  let deps: AppDeps | null;
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
  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [
      {
        chrome,
        docLinks,
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    deps = {
      chrome,
      docLinks,
      toastNotifications: mockes.notifications.toasts,
      injectedMetadata: mockes.injectedMetadata,
      http: mockes.http,
      uiSettings: mockes.uiSettings,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      capabilities: {
        ...capabilities,
        siem: {
          'alerting:show': true,
          'alerting:save': true,
          'alerting:delete': false,
        },
      },
      setBreadcrumbs: jest.fn(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
    };
  });

  describe('alert_form create alert', () => {
    let wrapper: ReactWrapper<any>;

    beforeAll(async () => {
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

      await act(async () => {
        if (deps) {
          wrapper = mountWithIntl(
            <AlertsContextProvider
              value={{
                addFlyoutVisible: true,
                setAddFlyoutVisibility: state => {},
                reloadAlerts: () => {
                  return new Promise<void>(() => {});
                },
                http: deps.http,
                actionTypeRegistry: deps.actionTypeRegistry,
                alertTypeRegistry: deps.alertTypeRegistry,
                toastNotifications: deps.toastNotifications,
                uiSettings: deps.uiSettings,
              }}
            >
              <AlertForm
                alert={initialAlert}
                dispatch={() => {}}
                errors={{ name: [] }}
                serverError={null}
              />
            </AlertsContextProvider>
          );
        }
      });

      await waitForRender(wrapper);
    });

    it('renders alert name', () => {
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', () => {
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="my-alert-type-SelectOption"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders registered action types', () => {
      const alertTypeSelectOptions = wrapper.find(
        '[data-test-subj=".server-log-ActionTypeSelectOption"]'
      );
      expect(alertTypeSelectOptions.exists()).toBeFalsy();
    });
  });

  describe('alert_form edit alert', () => {
    let wrapper: ReactWrapper<any>;

    beforeAll(async () => {
      alertTypeRegistry.list.mockReturnValue([alertType]);
      alertTypeRegistry.get.mockReturnValue(alertType);
      alertTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);

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

      await act(async () => {
        if (deps) {
          wrapper = mountWithIntl(
            <AlertsContextProvider
              value={{
                addFlyoutVisible: true,
                setAddFlyoutVisibility: state => {},
                reloadAlerts: () => {
                  return new Promise<void>(() => {});
                },
                http: deps.http,
                actionTypeRegistry: deps.actionTypeRegistry,
                alertTypeRegistry: deps.alertTypeRegistry,
                toastNotifications: deps.toastNotifications,
                uiSettings: deps.uiSettings,
              }}
            >
              <AlertForm
                alert={initialAlert}
                dispatch={() => {}}
                errors={{ name: [] }}
                serverError={null}
              />
            </AlertsContextProvider>
          );
        }
      });

      await waitForRender(wrapper);
    });

    it('renders alert name', () => {
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', () => {
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="selectedAlertTypeTitle"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('renders registered action types', () => {
      const actionTypeSelectOptions = wrapper.find(
        '[data-test-subj="my-action-type-ActionTypeSelectOption"]'
      );
      expect(actionTypeSelectOptions.exists()).toBeTruthy();
    });
  });

  async function waitForRender(wrapper: ReactWrapper<any, any>) {
    await Promise.resolve();
    await Promise.resolve();
    wrapper.update();
  }
});
