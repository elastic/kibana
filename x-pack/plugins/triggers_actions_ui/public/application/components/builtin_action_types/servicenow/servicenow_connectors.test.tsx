/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { DocLinksStart } from 'kibana/public';
import ServiceNowConnectorFields from './servicenow_connectors';
import { ServiceNowActionConnector } from './types';

describe('ServiceNowActionConnectorFields renders', () => {
  test('alerting servicenow connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        username: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.webhook',
      isPreconfigured: false,
      name: 'webhook',
      config: {
        apiUrl: 'https://test/',
      },
    } as ServiceNowActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
      />
    );
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-username-form-input"]').length > 0
    ).toBeTruthy();

    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('case specific servicenow connector fields is rendered', () => {
    const actionConnector = {
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
        incidentConfiguration: { mapping: [] },
        isCaseOwned: true,
      },
    } as ServiceNowActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
        consumer={'case'}
      />
    );
    expect(wrapper.find('[data-test-subj="case-servicenow-mappings"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-servicenow-password-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.servicenow',
      isPreconfigured: false,
      config: {},
      secrets: {},
    } as ServiceNowActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
  });

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
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
      },
    } as ServiceNowActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <ServiceNowConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], username: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });
});
