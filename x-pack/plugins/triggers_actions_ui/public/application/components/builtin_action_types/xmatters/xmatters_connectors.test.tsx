/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { XmattersActionConnector } from '../types';
import XmattersActionConnectorFields from './xmatters_connectors';

describe('XmattersActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        configUrl: 'http:\\test',
        usesBasic: true,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="xmattersUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should show only basic auth info when basic selected', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        configUrl: 'http:\\test',
        usesBasic: true,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="xmattersUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should show only url auth info when url selected', () => {
    const actionConnector = {
      secrets: {
        secretsUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        usesBasic: false,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="xmattersUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length === 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length === 0).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      secrets: {},
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      config: {
        usesBasic: true,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
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

  test('should display a message on edit to re-enter credentials, Basic Auth', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        configUrl: 'http:\\test',
        usesBasic: true,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
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
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      isMissingSecrets: true,
      name: 'xmatters',
      config: {
        configUrl: 'http:\\test',
        usesBasic: true,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="missingSecretsMessage"]').length).toBeGreaterThan(0);
  });

  test('should display a message on edit to re-enter credentials, URL Auth', () => {
    const actionConnector = {
      secrets: {
        secretsUrl: 'http:\\test?apiKey=someKey',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        usesBasic: false,
      },
    } as XmattersActionConnector;
    const wrapper = mountWithIntl(
      <XmattersActionConnectorFields
        action={actionConnector}
        errors={{ url: [], user: [], password: [] }}
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
