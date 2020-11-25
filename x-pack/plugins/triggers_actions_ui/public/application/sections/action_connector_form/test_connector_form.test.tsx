/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import TestConnectorForm from './test_connector_form';
import { none, some } from 'fp-ts/lib/Option';
import { ActionConnector, ValidationResult } from '../../../types';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionsConnectorsContextProvider } from '../../context/actions_connectors_context';
import { EuiFormRow, EuiFieldText, EuiText, EuiLink, EuiForm, EuiSelect } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';

const mockedActionParamsFields = lazy(async () => ({
  default() {
    return (
      <EuiForm component="form">
        <EuiFormRow label="Text field" helpText="I am some friendly help text.">
          <EuiFieldText data-test-subj="testInputField" />
        </EuiFormRow>

        <EuiFormRow
          label="Select (with no initial selection)"
          labelAppend={
            <EuiText size="xs">
              <EuiLink>Link to some help</EuiLink>
            </EuiText>
          }
        >
          <EuiSelect
            hasNoInitialSelection
            options={[
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ]}
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
}));

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
  actionParamsFields: mockedActionParamsFields,
};

describe('test_connector_form', () => {
  let deps: any;
  let actionTypeRegistry;
  beforeAll(async () => {
    actionTypeRegistry = actionTypeRegistryMock.create();

    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    deps = {
      http: mocks.http,
      toastNotifications: mocks.notifications.toasts,
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
      actionTypeRegistry,
      capabilities,
    };
    actionTypeRegistry.get.mockReturnValue(actionType);
  });

  it('renders initially as the action form and execute button and no result', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <I18nProvider>
        <ActionsConnectorsContextProvider
          value={{
            http: deps!.http,
            actionTypeRegistry: deps!.actionTypeRegistry,
            capabilities: deps!.capabilities,
            toastNotifications: deps!.toastNotifications,
            reloadConnectors: () => {
              return new Promise<void>(() => {});
            },
            docLinks: deps!.docLinks,
          }}
        >
          <TestConnectorForm
            connector={connector}
            executeEnabled={true}
            actionParams={{}}
            setActionParams={() => {}}
            isExecutingAction={false}
            onExecutAction={async () => ({
              actionId: '',
              status: 'ok',
            })}
            executionResult={none}
          />
        </ActionsConnectorsContextProvider>
      </I18nProvider>
    );
    const executeActionButton = wrapper?.find('[data-test-subj="executeActionButton"]');
    expect(executeActionButton?.exists()).toBeTruthy();
    expect(executeActionButton?.first().prop('isDisabled')).toBe(false);

    const result = wrapper?.find('[data-test-subj="executionAwaiting"]');
    expect(result?.exists()).toBeTruthy();
  });

  it('renders successful results', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <I18nProvider>
        <ActionsConnectorsContextProvider
          value={{
            http: deps!.http,
            actionTypeRegistry: deps!.actionTypeRegistry,
            capabilities: deps!.capabilities,
            toastNotifications: deps!.toastNotifications,
            reloadConnectors: () => {
              return new Promise<void>(() => {});
            },
            docLinks: deps!.docLinks,
          }}
        >
          <TestConnectorForm
            connector={connector}
            executeEnabled={true}
            actionParams={{}}
            setActionParams={() => {}}
            isExecutingAction={false}
            onExecutAction={async () => ({
              actionId: '',
              status: 'ok',
            })}
            executionResult={some({
              actionId: '',
              status: 'ok',
            })}
          />
        </ActionsConnectorsContextProvider>
      </I18nProvider>
    );
    const result = wrapper?.find('[data-test-subj="executionSuccessfulResult"]');
    expect(result?.exists()).toBeTruthy();
  });

  it('renders failure results', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <I18nProvider>
        <ActionsConnectorsContextProvider
          value={{
            http: deps!.http,
            actionTypeRegistry: deps!.actionTypeRegistry,
            capabilities: deps!.capabilities,
            toastNotifications: deps!.toastNotifications,
            reloadConnectors: () => {
              return new Promise<void>(() => {});
            },
            docLinks: deps!.docLinks,
          }}
        >
          <TestConnectorForm
            connector={connector}
            executeEnabled={true}
            actionParams={{}}
            setActionParams={() => {}}
            isExecutingAction={false}
            onExecutAction={async () => ({
              actionId: '',
              status: 'error',
              message: 'Error Message',
            })}
            executionResult={some({
              actionId: '',
              status: 'error',
              message: 'Error Message',
            })}
          />
        </ActionsConnectorsContextProvider>
      </I18nProvider>
    );
    const result = wrapper?.find('[data-test-subj="executionFailureResult"]');
    expect(result?.exists()).toBeTruthy();
  });
});
