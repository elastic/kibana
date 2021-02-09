/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { SessionIdleTimeoutWarning } from './session_idle_timeout_warning';

describe('SessionIdleTimeoutWarning', () => {
  it('fires its callback when the OK button is clicked', () => {
    const handler = jest.fn();
    const wrapper = mountWithIntl(
      <SessionIdleTimeoutWarning onRefreshSession={handler} timeout={1000} />
    );

    expect(handler).toBeCalledTimes(0);
    wrapper.find('EuiButton[data-test-subj="refreshSessionButton"]').simulate('click');
    expect(handler).toBeCalledTimes(1);
  });
});
