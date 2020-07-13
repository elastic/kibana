/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ServerLogLevelOptions } from '.././types';
import ServerLogParamsFields from './server_log_params';

describe('ServerLogParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      level: ServerLogLevelOptions.TRACE,
      message: 'test',
    };
    const wrapper = mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
        defaultMessage={'test default message'}
      />
    );
    expect(wrapper.find('[data-test-subj="loggingLevelSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="loggingLevelSelect"]').first().prop('value')
    ).toStrictEqual('trace');
    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
  });

  test('level param field is rendered with default value if not selected', () => {
    const actionParams = {
      message: 'test message',
      level: ServerLogLevelOptions.INFO,
    };
    const wrapper = mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="loggingLevelSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="loggingLevelSelect"]').first().prop('value')
    ).toStrictEqual('info');
    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
  });
});
