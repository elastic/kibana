/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import SlackParamsFields from './slack_params';

describe('SlackParamsFields renders', () => {
  test('all params fields is rendered, Webhook', () => {
    const wrapper = mountWithIntl(
      <SlackParamsFields
        actionConnector={{ config: { type: 'webhook' } } as any}
        actionParams={{ message: 'test message' }}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="messageTextArea"]').first().prop('value')).toStrictEqual(
      'test message'
    );
  });

  test('all params fields is rendered, Web API', () => {
    const wrapper = mountWithIntl(
      <SlackParamsFields
        actionConnector={{ config: { type: 'web_api' } } as any}
        actionParams={{
          subAction: 'postMessage',
          subActionParams: { channels: ['general'], text: 'some text' },
        }}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage="default message"
        messageVariables={[]}
      />
    );

    expect(wrapper.find('[data-test-subj="webApiTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="webApiTextArea"]').first().prop('value')).toStrictEqual(
      'some text'
    );
  });
});
