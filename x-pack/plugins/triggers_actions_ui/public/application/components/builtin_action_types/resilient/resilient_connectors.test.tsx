/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import ResilientConnectorFields from './resilient_connectors';
import { ResilientActionConnector } from './types';
jest.mock('../../../../common/lib/kibana');

describe('ResilientActionConnectorFields renders', () => {
  test('alerting Resilient connector fields are rendered', () => {
    const actionConnector = {
      secrets: {
        apiKeyId: 'key',
        apiKeySecret: 'secret',
      },
      id: 'test',
      actionTypeId: '.resilient',
      isPreconfigured: false,
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
    } as ResilientActionConnector;
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-resilient-orgId-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('case specific Resilient connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        apiKeyId: 'email',
        apiKeySecret: 'token',
      },
      id: 'test',
      actionTypeId: '.resilient',
      isPreconfigured: false,
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
    } as ResilientActionConnector;
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        consumer={'case'}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-resilient-orgId-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.resilient',
      isPreconfigured: false,
      config: {},
      secrets: {},
    } as ResilientActionConnector;
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
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
      actionTypeId: '.resilient',
      isPreconfigured: false,
      config: {},
      secrets: {},
      isMissingSecrets: true,
    } as ResilientActionConnector;
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="missingSecretsMessage"]').length).toBeGreaterThan(0);
  });

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
      secrets: {
        apiKeyId: 'key',
        apiKeySecret: 'secret',
      },
      id: 'test',
      actionTypeId: '.resilient',
      isPreconfigured: false,
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
    } as ResilientActionConnector;
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
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
