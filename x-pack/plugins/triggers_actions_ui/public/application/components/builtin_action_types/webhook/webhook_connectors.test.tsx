/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { WebhookActionConnector } from '../types';
import WebhookActionConnectorFields from './webhook_connectors';

describe('WebhookActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: { 'content-type': 'text' },
        hasAuth: true,
      },
    } as WebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={{ url: [], method: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeaderText"]').length > 0).toBeTruthy();
    wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="webhookMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      secrets: {},
      actionTypeId: '.webhook',
      isPreconfigured: false,
      isDeprecated: false,
      config: {
        hasAuth: true,
      },
    } as WebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={{ url: [], method: [], user: [], password: [] }}
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

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: { 'content-type': 'text' },
        hasAuth: true,
      },
    } as WebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={{ url: [], method: [], user: [], password: [] }}
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

  test('should display a message for missing secrets after import', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      isPreconfigured: false,
      isDeprecated: false,
      isMissingSecrets: true,
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: { 'content-type': 'text' },
        hasAuth: true,
      },
    } as WebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={{ url: [], method: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="missingSecretsMessage"]').length).toBeGreaterThan(0);
  });
});
