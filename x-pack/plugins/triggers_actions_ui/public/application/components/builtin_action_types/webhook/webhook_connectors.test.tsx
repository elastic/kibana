/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { WebhookActionConnector } from '../types';
import WebhookActionConnectorFields from './webhook_connectors';
import { DocLinksStart } from 'kibana/public';

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
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: { 'content-type': 'text' },
      },
    } as WebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookActionConnectorFields
        action={actionConnector}
        errors={{ url: [], method: [], user: [], password: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
      />
    );
    expect(wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').length > 0).toBeTruthy();
    wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="webhookMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookPasswordInput"]').length > 0).toBeTruthy();
  });
});
