/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { SlackActionConnector } from '../types';
import SlackActionFields from './slack_connectors';

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;
    const wrapper = mountWithIntl(
      <SlackActionFields
        action={actionConnector}
        errors={{ webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
      />
    );
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="slackWebhookUrlInput"]')
        .first()
        .prop('value')
    ).toBe('http:\\test');
  });
});
