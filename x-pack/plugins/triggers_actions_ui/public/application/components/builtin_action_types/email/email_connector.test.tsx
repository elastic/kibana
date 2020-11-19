/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { EmailActionConnector } from '../types';
import EmailActionConnectorFields from './email_connector';
import { DocLinksStart } from 'kibana/public';

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
        errors={{ from: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="emailFromInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailFromInput"]').first().prop('value')).toBe(
      'test@test.com'
    );
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
        errors={{ from: [], port: [], host: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        readOnly={false}
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
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
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
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });
});
