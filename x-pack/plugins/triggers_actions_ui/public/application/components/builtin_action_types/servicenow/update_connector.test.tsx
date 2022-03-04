/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { UpdateConnector, Props } from './update_connector';
import { ServiceNowActionConnector } from './types';
jest.mock('../../../../common/lib/kibana');

const actionConnector: ServiceNowActionConnector = {
  secrets: {
    username: 'user',
    password: 'pass',
  },
  id: 'test',
  actionTypeId: '.servicenow',
  isPreconfigured: false,
  name: 'servicenow',
  config: {
    apiUrl: 'https://test/',
    usesTableApi: true,
  },
};

const mountUpdateConnector = (props: Partial<Props> = {}) => {
  return mountWithIntl(
    <UpdateConnector
      action={actionConnector}
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

  it('should disable submit button if errors or fields missing', () => {
    const wrapper = mountUpdateConnector({
      errors: { apiUrl: ['some error'], username: [], password: [] },
    });

    expect(
      wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().prop('disabled')
    ).toBeTruthy();

    wrapper.setProps({ ...wrapper.props(), errors: { apiUrl: [], username: [], password: [] } });
    expect(
      wrapper.find('[data-test-subj="snUpdateInstallationSubmit"]').first().prop('disabled')
    ).toBeFalsy();

    wrapper.setProps({
      ...wrapper.props(),
      action: { ...actionConnector, secrets: { ...actionConnector.secrets, username: undefined } },
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
