/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import WebhookParamsFields from './webhook_params';

describe('WebhookParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      body: 'test message',
    };
    const wrapper = mountWithIntl(
      <WebhookParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="webhookBodyEditor"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="webhookBodyEditor"]').first().prop('value')
    ).toStrictEqual('test message');
    expect(wrapper.find('[data-test-subj="bodyAddVariableButton"]').length > 0).toBeTruthy();
  });
});
