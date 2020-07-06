/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from '@testing-library/react';
import { SlackActionConnector } from '../types';
import SlackActionFields from './slack_connectors';
import { DocLinksStart } from 'kibana/public';

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <SlackActionFields
        action={actionConnector}
        errors={{ index: [], webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').first().prop('value')).toBe(
      'http:\\test'
    );
  });
});
