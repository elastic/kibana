/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EmailActionConnector } from '../types';
import EmailActionConnectorFields from './email_connector';
import * as hooks from './use_email_config';

jest.mock('../../../../common/lib/kibana');

describe('EmailActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeTruthy();
  });

  test('secret connector fields is not rendered when hasAuth false', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: false,
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeFalsy();
  });

  test('service field defaults to empty when not defined', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('select[data-test-subj="emailServiceSelectInput"]').prop('value')).toEqual(
      ''
    );
  });

  test('service field is correctly selected when defined', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'gmail',
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('select[data-test-subj="emailServiceSelectInput"]').prop('value')).toEqual(
      'gmail'
    );
  });

  test('host, port and secure fields should be disabled when service field is set to well known service', () => {
    jest
      .spyOn(hooks, 'useEmailConfig')
      .mockImplementation(() => ({ emailServiceConfigurable: false, setEmailService: jest.fn() }));
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'gmail',
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailHostInput"]').first().prop('disabled')).toBe(true);
    expect(wrapper.find('[data-test-subj="emailPortInput"]').first().prop('disabled')).toBe(true);
    expect(wrapper.find('[data-test-subj="emailSecureSwitch"]').first().prop('disabled')).toBe(
      true
    );
  });

  test('host, port and secure fields should not be disabled when service field is set to other', () => {
    jest
      .spyOn(hooks, 'useEmailConfig')
      .mockImplementation(() => ({ emailServiceConfigurable: true, setEmailService: jest.fn() }));
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
        service: 'other',
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [], service: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailHostInput"]').first().prop('disabled')).toBe(false);
    expect(wrapper.find('[data-test-subj="emailPortInput"]').first().prop('disabled')).toBe(false);
    expect(wrapper.find('[data-test-subj="emailSecureSwitch"]').first().prop('disabled')).toBe(
      false
    );
  });

  test('should display a message to remember username and password when creating a connector with authentication', () => {
    const actionConnector = {
      actionTypeId: '.email',
      config: {
        hasAuth: true,
      },
      secrets: {},
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
  });

  test('should display a message for missing secrets after import', () => {
    const actionConnector = {
      actionTypeId: '.email',
      config: {
        hasAuth: true,
      },
      isMissingSecrets: true,
      secrets: {},
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="missingSecretsMessage"]').length).toBeGreaterThan(0);
  });

  test('should display a message when editing an authenticated email connector explaining why username and password must be re-entered', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: true,
      },
    } as EmailActionConnector;
    const wrapper = mountWithIntl(
      <EmailActionConnectorFields
        action={actionConnector}
        errors={{ from: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });
});
