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
  test('all params fields is rendered', () => {
    const actionParams = {
      message: 'test message',
    };

    const wrapper = mountWithIntl(
      <SlackParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="messageTextArea"]').first().prop('value')).toStrictEqual(
      'test message'
    );
  });
});
