/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import EmailActionConnectorFields from './email_connector';
import * as hooks from './use_email_config';
import { FormTestProvider, waitForComponentToUpdate } from '../test_utils';

jest.mock('../../../../common/lib/kibana');

describe('EmailActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
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
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

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

  test('secret connector fields is not rendered when hasAuth false', async () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        hasAuth: false,
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailHostInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailPortInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailUserInput"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="emailPasswordInput"]').length > 0).toBeFalsy();
  });

  test('service field defaults to empty when not defined', async () => {
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
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('select[data-test-subj="emailServiceSelectInput"]').prop('value')).toEqual(
      ''
    );
  });

  test('service field is correctly selected when defined', async () => {
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
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailServiceSelectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('select[data-test-subj="emailServiceSelectInput"]').prop('value')).toEqual(
      'gmail'
    );
  });

  test('host, port and secure fields should be disabled when service field is set to well known service', async () => {
    const getEmailServiceConfig = jest
      .fn()
      .mockResolvedValue({ host: 'https://example.com', port: 80, secure: false });
    jest
      .spyOn(hooks, 'useEmailConfig')
      .mockImplementation(() => ({ isLoading: false, getEmailServiceConfig }));

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
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

    wrapper.update();
    expect(wrapper.find('[data-test-subj="emailHostInput"]').first().prop('disabled')).toBe(true);
    expect(wrapper.find('[data-test-subj="emailPortInput"]').first().prop('disabled')).toBe(true);
    expect(wrapper.find('[data-test-subj="emailSecureSwitch"]').first().prop('disabled')).toBe(
      true
    );
  });

  test('host, port and secure fields should not be disabled when service field is set to other', async () => {
    const getEmailServiceConfig = jest
      .fn()
      .mockResolvedValue({ host: 'https://example.com', port: 80, secure: false });
    jest
      .spyOn(hooks, 'useEmailConfig')
      .mockImplementation(() => ({ isLoading: false, getEmailServiceConfig }));

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
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <EmailActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="emailHostInput"]').first().prop('disabled')).toBe(false);
    expect(wrapper.find('[data-test-subj="emailPortInput"]').first().prop('disabled')).toBe(false);
    expect(wrapper.find('[data-test-subj="emailSecureSwitch"]').first().prop('disabled')).toBe(
      false
    );
  });
});
