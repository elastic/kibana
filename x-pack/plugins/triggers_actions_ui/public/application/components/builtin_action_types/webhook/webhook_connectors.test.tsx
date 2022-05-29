/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import WebhookActionConnectorFields from './webhook_connectors';
import { ConnectorFormTestProvider, waitForComponentToUpdate } from '../test_utils';

describe('WebhookActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      actionTypeId: '.webhook',
      name: 'webhook',
      config: {
        method: 'PUT',
        url: 'http:\\test',
        headers: { 'content-type': 'text' },
        hasAuth: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <WebhookActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookHeaderText"]').length > 0).toBeTruthy();
    wrapper.find('[data-test-subj="webhookViewHeadersSwitch"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="webhookMethodSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUrlText"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webhookPasswordInput"]').length > 0).toBeTruthy();
  });
});
