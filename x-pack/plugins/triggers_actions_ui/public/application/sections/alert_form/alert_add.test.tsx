/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormLabel } from '@elastic/eui';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import AlertAdd from './alert_add';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult } from '../../../types';
import { AlertsContextProvider, useAlertsContext } from '../../context/alerts_context';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { chartPluginMock } from '../../../../../../../src/plugins/charts/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { ReactWrapper } from 'enzyme';
import { AppContextProvider } from '../../app_context';
const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();

export const TestExpression: React.FunctionComponent<any> = () => {
  const alertsContext = useAlertsContext();
  const { metadata } = alertsContext;

  return (
    <EuiFormLabel>
      <FormattedMessage
        defaultMessage="Metadata: {val}. Fields: {fields}."
        id="xpack.triggersActionsUI.sections.alertAdd.metadataTest"
        values={{ val: metadata!.test, fields: metadata!.fields.join(' ') }}
      />
    </EuiFormLabel>
  );
};

describe('alert_add', () => {
  let deps: any;
  let wrapper: ReactWrapper<any>;

  async function setup() {
    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    deps = {
      toastNotifications: mocks.notifications.toasts,
      http: mocks.http,
      uiSettings: mocks.uiSettings,
      dataPlugin: dataPluginMock.createStartContract(),
      charts: chartPluginMock.createStartContract(),
      actionTypeRegistry: actionTypeRegistry as any,
      alertTypeRegistry: alertTypeRegistry as any,
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
    };

    mocks.http.get.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });

    const alertType = {
      id: 'my-alert-type',
      iconClass: 'test',
      name: 'test-alert',
      validate: (): ValidationResult => {
        return { errors: {} };
      },
      alertParamsExpression: TestExpression,
      requiresAppContext: false,
    };

    const actionTypeModel = {
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
    actionTypeRegistry.get.mockReturnValueOnce(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);
    alertTypeRegistry.list.mockReturnValue([alertType]);
    alertTypeRegistry.get.mockReturnValue(alertType);
    alertTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.list.mockReturnValue([actionTypeModel]);
    actionTypeRegistry.has.mockReturnValue(true);

    wrapper = mountWithIntl(
      <AppContextProvider appDeps={deps}>
        <AlertsContextProvider
          value={{
            reloadAlerts: () => {
              return new Promise<void>(() => {});
            },
            http: deps.http,
            actionTypeRegistry: deps.actionTypeRegistry,
            alertTypeRegistry: deps.alertTypeRegistry,
            toastNotifications: deps.toastNotifications,
            uiSettings: deps.uiSettings,
            docLinks: deps.docLinks,
            metadata: { test: 'some value', fields: ['test'] },
            capabilities: {
              ...capabilities,
              actions: {
                delete: true,
                save: true,
                show: true,
              },
            },
          }}
        >
          <AlertAdd consumer={'alerts'} addFlyoutVisible={true} setAddFlyoutVisibility={() => {}} />
        </AlertsContextProvider>
      </AppContextProvider>
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders alert add flyout', async () => {
    await setup();

    expect(wrapper.find('[data-test-subj="addAlertFlyoutTitle"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="saveAlertButton"]').exists()).toBeTruthy();

    wrapper.find('[data-test-subj="my-alert-type-SelectOption"]').first().simulate('click');

    expect(wrapper.contains('Metadata: some value. Fields: test.')).toBeTruthy();
  });
});
