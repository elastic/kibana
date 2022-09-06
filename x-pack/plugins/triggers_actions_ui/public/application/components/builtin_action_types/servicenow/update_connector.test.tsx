/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Props, UpdateConnector } from './update_connector';
import { ServiceNowActionConnector } from './types';
import { ActionConnectorFieldsProps } from '../../../../types';

jest.mock('../../../../common/lib/kibana');

const actionConnectorBasicAuth: ServiceNowActionConnector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  isPreconfigured: false,
  isDeprecated: false,
  name: 'servicenow',
  config: {
    apiUrl: 'https://test/',
    usesTableApi: true,
    isOAuth: false,
  },
};

const actionConnectorOAuth: ServiceNowActionConnector = {
  secrets: {
    clientSecret: 'clientSecret',
    privateKey: 'privateKey',
    privateKeyPassword: 'privateKeyPassword',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  isPreconfigured: false,
  isDeprecated: false,
  name: 'servicenow',
  config: {
    apiUrl: 'https://test/',
    usesTableApi: true,
    isOAuth: true,
    clientId: 'cid',
    userIdentifierValue: 'test@testuserIdentifierValue.com',
    jwtKeyId: 'jwtKeyId',
  },
};

const mountUpdateConnector = (
  props: Partial<Props> = {},
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'] = actionConnectorBasicAuth
) => {
  return mountWithIntl(
    <UpdateConnector
      action={action}
      applicationInfoErrorMsg={null}
      errors={{ apiUrl: [], username: [], password: [] }}
      editActionConfig={() => {}}
      editActionSecrets={() => {}}
      readOnly={false}
      isLoading={false}
      onConfirm={() => {}}
      onCancel={() => {}}
      {...props}
    />
  );
};

describe('UpdateConnector renders', () => {
  it('should render update connector fields', () => {
    const wrapper = mountUpdateConnector();

    expect(wrapper.find('[data-test-subj="snUpdateInstallationCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="updateConnectorForm"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-username-form-input"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').exists()
    ).toBeTruthy();
  });

  it('should render update connector fields for OAuth', () => {
    const wrapper = mountUpdateConnector({}, actionConnectorOAuth);
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-client-id-form-input"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-client-secret-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-servicenow-user-identifier-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-servicenow-jwt-key-id-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-servicenow-private-key-form-input"]').exists()
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-password-form-input"]')
        .exists()
    ).toBeTruthy();
  });

  it('should disable inputs on loading', () => {
    const wrapper = mountUpdateConnector({ isLoading: true });
    expect(
      wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').first().prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-username-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-password-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
  });

  it('should disable inputs on loading for OAuth', () => {
    const wrapper = mountUpdateConnector({ isLoading: true }, actionConnectorOAuth);

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-id-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-secret-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-user-identifier-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-jwt-key-id-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-password-form-input"]')
        .first()
        .prop('disabled')
    ).toBeTruthy();
  });

  it('should set inputs as read-only', () => {
    const wrapper = mountUpdateConnector({ readOnly: true });

    expect(
      wrapper.find('[data-test-subj="credentialsApiUrlFromInput"]').first().prop('readOnly')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-username-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-password-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
  });

  it('should set inputs as read-only for OAuth', () => {
    const wrapper = mountUpdateConnector({ readOnly: true }, actionConnectorOAuth);

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-id-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-client-secret-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-user-identifier-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-jwt-key-id-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();

    expect(
      wrapper
        .find('[data-test-subj="connector-servicenow-private-key-password-form-input"]')
        .first()
        .prop('readOnly')
    ).toBeTruthy();
  });

  it('should disable submit button if errors or fields missing', () => {
    const wrapper = mountUpdateConnector(
      {
        errors: { apiUrl: ['some error'], username: [], password: [] },
      },
      actionConnectorBasicAuth
    );

    expect(
      wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().prop('disabled')
    ).toBeTruthy();

    wrapper.setProps({ ...wrapper.props(), errors: { apiUrl: [], username: [], password: [] } });
    expect(
      wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().prop('disabled')
    ).toBeFalsy();

    wrapper.setProps({
      ...wrapper.props(),
      action: {
        ...actionConnectorBasicAuth,
        secrets: { ...actionConnectorBasicAuth.secrets, username: undefined },
      },
    });
    expect(
      wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().prop('disabled')
    ).toBeTruthy();
  });

  it('should call editActionConfig when editing api url', () => {
    const editActionConfig = jest.fn();
    const wrapper = mountUpdateConnector({ editActionConfig });

    expect(editActionConfig).not.toHaveBeenCalled();
    wrapper
      .find('input[data-test-subj="credentialsApiUrlFromInput"]')
      .simulate('change', { target: { value: 'newUrl' } });
    expect(editActionConfig).toHaveBeenCalledWith('apiUrl', 'newUrl');
  });

  it('should call editActionSecrets when editing username or password', () => {
    const editActionSecrets = jest.fn();
    const wrapper = mountUpdateConnector({ editActionSecrets });

    expect(editActionSecrets).not.toHaveBeenCalled();
    wrapper
      .find('input[data-test-subj="connector-servicenow-username-form-input"]')
      .simulate('change', { target: { value: 'new username' } });
    expect(editActionSecrets).toHaveBeenCalledWith('username', 'new username');

    wrapper
      .find('input[data-test-subj="connector-servicenow-password-form-input"]')
      .simulate('change', { target: { value: 'new pass' } });

    expect(editActionSecrets).toHaveBeenCalledTimes(2);
    expect(editActionSecrets).toHaveBeenLastCalledWith('password', 'new pass');
  });

  it('should call editActionSecrets and/or editActionConfig when editing oAuth fields', () => {
    const editActionSecrets = jest.fn();
    const editActionConfig = jest.fn();
    const wrapper = mountUpdateConnector(
      { editActionSecrets, editActionConfig },
      actionConnectorOAuth
    );

    expect(editActionSecrets).not.toHaveBeenCalled();

    wrapper
      .find('input[data-test-subj="connector-servicenow-client-id-form-input"]')
      .simulate('change', { target: { value: 'new-value' } });
    expect(editActionConfig).toHaveBeenCalledWith('clientId', 'new-value');

    wrapper
      .find('input[data-test-subj="connector-servicenow-user-identifier-form-input"]')
      .simulate('change', { target: { value: 'new-value' } });
    expect(editActionConfig).toHaveBeenCalledWith('userIdentifierValue', 'new-value');

    wrapper
      .find('input[data-test-subj="connector-servicenow-jwt-key-id-form-input"]')
      .simulate('change', { target: { value: 'new-value' } });
    expect(editActionConfig).toHaveBeenCalledWith('jwtKeyId', 'new-value');

    wrapper
      .find('input[data-test-subj="connector-servicenow-client-secret-form-input"]')
      .simulate('change', { target: { value: 'new-value' } });
    expect(editActionSecrets).toHaveBeenCalledWith('clientSecret', 'new-value');

    wrapper
      .find('textarea[data-test-subj="connector-servicenow-private-key-form-input"]')
      .simulate('change', { target: { value: 'new-value' } });
    expect(editActionSecrets).toHaveBeenCalledWith('privateKey', 'new-value');

    wrapper
      .find('input[data-test-subj="connector-servicenow-private-key-password-form-input"]')
      .simulate('change', { target: { value: 'new-value' } });
    expect(editActionSecrets).toHaveBeenCalledWith('privateKeyPassword', 'new-value');

    expect(editActionConfig).toHaveBeenCalledTimes(3);
    expect(editActionSecrets).toHaveBeenCalledTimes(3);
    expect(editActionSecrets).toHaveBeenLastCalledWith('privateKeyPassword', 'new-value');
  });

  it('should confirm the update when submit button clicked', () => {
    const onConfirm = jest.fn();
    const wrapper = mountUpdateConnector({ onConfirm });

    expect(onConfirm).not.toHaveBeenCalled();
    wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().simulate('click');
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should cancel the update when cancel button clicked', () => {
    const onCancel = jest.fn();
    const wrapper = mountUpdateConnector({ onCancel });

    expect(onCancel).not.toHaveBeenCalled();
    wrapper.find('[data-test-subj="snUpdateInstallationCancel"]').first().simulate('click');
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show error message if present', () => {
    const applicationInfoErrorMsg = 'some application error';
    const wrapper = mountUpdateConnector({
      applicationInfoErrorMsg,
    });

    expect(wrapper.find('[data-test-subj="snApplicationCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="snApplicationCallout"]').first().text()).toContain(
      applicationInfoErrorMsg
    );
  });
});
