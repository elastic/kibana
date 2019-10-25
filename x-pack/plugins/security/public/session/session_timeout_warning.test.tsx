/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { SessionTimeoutWarning } from './session_timeout_warning';

describe('SessionTimeoutWarning', () => {
  it('fires its callback when the OK button is clicked', () => {
    const handler = jest.fn();
    const wrapper = mountWithIntl(<SessionTimeoutWarning onRefreshSession={handler} />);

    expect(handler).toBeCalledTimes(0);
    wrapper.find('EuiButton[data-test-subj="refreshSessionButton"]').simulate('click');
    expect(handler).toBeCalledTimes(1);
  });
});
