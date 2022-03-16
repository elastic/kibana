/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import TestConnectorForm from './test_connector_form';
import { none, some } from 'fp-ts/lib/Option';
import {
  ActionConnector,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../types';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { EuiFormRow, EuiFieldText, EuiText, EuiLink, EuiForm, EuiSelect } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
jest.mock('../../../common/lib/kibana');

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
  validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
    return Promise.resolve({});
  },
  validateParams: (): Promise<GenericValidationResult<unknown>> => {
    const validationResult = { errors: {} };
    return Promise.resolve(validationResult);
  },
  actionConnectorFields: null,
  actionParamsFields: mockedActionParamsFields,
};
const actionTypeRegistry = actionTypeRegistryMock.create();
actionTypeRegistry.get.mockReturnValue(actionType);

describe('test_connector_form', () => {
  it('renders initially as the action form and execute button and no result', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    const wrapper = mountWithIntl(
      <I18nProvider>
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
          actionTypeRegistry={actionTypeRegistry}
        />
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
          actionTypeRegistry={actionTypeRegistry}
        />
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
          actionTypeRegistry={actionTypeRegistry}
        />
      </I18nProvider>
    );
    const result = wrapper?.find('[data-test-subj="executionFailureResult"]');
    expect(result?.exists()).toBeTruthy();
  });
});
