/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { DocLinksStart } from 'kibana/public';
import JiraConnectorFields from './jira_connectors';
import { JiraActionConnector } from './types';

describe('JiraActionConnectorFields renders', () => {
  test('alerting Jira connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        email: 'email',
        apiToken: 'token',
      },
      id: 'test',
      actionTypeId: '.jira',
      isPreconfigured: false,
      name: 'jira',
      config: {
        apiUrl: 'https://test/',
        projectKey: 'CK',
      },
    } as JiraActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <JiraConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], email: [], apiToken: [], projectKey: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
      />
    );

    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-jira-project-key-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-jira-email-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-jira-apiToken-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('case specific Jira connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        email: 'email',
        apiToken: 'token',
      },
      id: 'test',
      actionTypeId: '.jira',
      isPreconfigured: false,
      name: 'jira',
      config: {
        apiUrl: 'https://test/',
        projectKey: 'CK',
      },
    } as JiraActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <JiraConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], email: [], apiToken: [], projectKey: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
        consumer={'case'}
      />
    );
    expect(wrapper.find('[data-test-subj="case-jira-mappings"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-jira-project-key-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-jira-email-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-jira-apiToken-form-input"]').length > 0
    ).toBeTruthy();
  });
});
