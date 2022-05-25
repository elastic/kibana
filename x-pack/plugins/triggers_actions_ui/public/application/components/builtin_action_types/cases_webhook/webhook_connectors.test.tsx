/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { CasesWebhookActionConnector } from './types';
import WebhookActionConnectorFields from './webhook_connectors';
import { MockCodeEditor } from '../../../code_editor.mock';
jest.mock('../../../../common/lib/kibana');
const kibanaReactPath = '../../../../../../../../src/plugins/kibana_react/public';

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

const config = {
  createCommentJson: '{"body":"$COMMENT"}',
  createCommentMethod: 'post',
  createCommentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID/comment',
  createIncidentJson:
    '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  createIncidentMethod: 'post',
  createIncidentResponseKey: 'id',
  createIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
  getIncidentResponseCreatedDateKey: 'fields.created',
  getIncidentResponseExternalTitleKey: 'key',
  getIncidentResponseUpdatedDateKey: 'fields.udpated',
  hasAuth: true,
  headers: { 'content-type': 'text' },
  incidentViewUrl: 'https://siem-kibana.atlassian.net/browse/$TITLE',
  getIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
  updateIncidentJson:
    '{"fields":{"summary":"$SUM","description":"$DESC","project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
  updateIncidentMethod: 'put',
  updateIncidentUrl: 'https://siem-kibana.atlassian.net/rest/api/2/issue/$ID',
};

const configErrors = {
  createCommentJson: [],
  createCommentMethod: [],
  createCommentUrl: [],
  createIncidentJson: [],
  createIncidentMethod: [],
  createIncidentResponseKey: [],
  createIncidentUrl: [],
  getIncidentResponseCreatedDateKey: [],
  getIncidentResponseExternalTitleKey: [],
  getIncidentResponseUpdatedDateKey: [],
  incidentViewUrl: [],
  getIncidentUrl: [],
  updateIncidentJson: [],
  updateIncidentMethod: [],
  updateIncidentUrl: [],
};

describe('WebhookActionConnectorFields renders', () => {
  test('all connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.cases-webhook',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'cases webhook',
      config,
    } as CasesWebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={configErrors}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="webhookCreateMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookCreateUrlText"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="createIncidentResponseKeyText"]').length > 0
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookCreateUrlText"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="getIncidentResponseExternalTitleKeyText"]').length > 0
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="getIncidentResponseCreatedDateKeyText"]').length > 0
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="getIncidentResponseUpdatedDateKeyText"]').length > 0
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="incidentViewUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUpdateMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUpdateUrlText"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="webhookCreateCommentMethodSelect"]').length > 0
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUpdateUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookPasswordInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').length > 0).toBeTruthy();

    expect(wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeaderText"]').length > 0).toBeTruthy();
    wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').last().simulate('click');
    expect(wrapper.find('[data-test-subj="webhookAddHeaderButton"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeadersKeyInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeadersValueInput"]').length > 0).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      secrets: {},
      actionTypeId: '.cases-webhook',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'cases webhook',
      config,
    } as unknown as CasesWebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={{}}
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
      actionTypeId: '.cases-webhook',
      isPreconfigured: false,
      isDeprecated: true,
      name: 'webhook',
      config,
    } as CasesWebhookActionConnector;
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
      isMissingSecrets: true,
      isDeprecated: false,
      name: 'webhook',
      config,
    } as CasesWebhookActionConnector;
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
