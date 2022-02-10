/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionUsername } from './username';

const props = {
  username: 'elastic',
  fullName: 'Elastic',
};

describe('UserActionUsername ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionUsername {...props} />);
  });

  it('it renders', async () => {
    expect(
      wrapper.find('[data-test-subj="user-action-username-tooltip"]').first().exists()
    ).toBeTruthy();
  });

  it('it shows the username', async () => {
    expect(wrapper.find('[data-test-subj="user-action-username-tooltip"]').text()).toBe('elastic');
  });

  test('it shows the fullname when hovering the username', () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers();

    wrapper.find('[data-test-subj="user-action-username-tooltip"]').first().simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();

    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').text()).toBe('Elastic');

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });

  test('it shows the username when hovering the username and the fullname is missing', () => {
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers();

    const newWrapper = mount(<UserActionUsername username="elastic" />);
    newWrapper
      .find('[data-test-subj="user-action-username-tooltip"]')
      .first()
      .simulate('mouseOver');

    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();

    newWrapper.update();
    expect(newWrapper.find('.euiToolTipPopover').text()).toBe('elastic');

    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });
});
