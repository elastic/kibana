/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import JiraConnectorFields from './jira_connectors';
import { ConnectorFormTestProvider } from '../test_utils';

jest.mock('../../../../common/lib/kibana');

describe('JiraActionConnectorFields renders', () => {
  test('alerting Jira connector fields are rendered', () => {
    const actionConnector = {
      actionTypeId: '.jira',
      name: 'jira',
      config: {
        apiUrl: 'https://test/',
        projectKey: 'CK',
      },
      secrets: {
        email: 'email',
        apiToken: 'token',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <ConnectorFormTestProvider connector={actionConnector}>
        <JiraConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="config.apiUrl-input"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="config.projectKey-input"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="secrets.email-input"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="secrets.apiToken-input"]').length > 0).toBeTruthy();
  });
});
