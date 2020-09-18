/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionAvatar } from './user_action_avatar';

const props = {
  username: 'elastic',
  fullName: 'Elastic',
};

describe('UserActionAvatar ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionAvatar {...props} />);
  });

  it('it renders', async () => {
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().exists()).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="user-action-avatar-loading-spinner"]`).first().exists()
    ).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().text()).toBe('E');
  });

  it('it shows the username if the fullName is undefined', async () => {
    wrapper = mount(<UserActionAvatar username={'elastic'} />);
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().exists()).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="user-action-avatar-loading-spinner"]`).first().exists()
    ).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().text()).toBe('e');
  });

  it('shows the loading spinner when the username AND the fullName are undefined', async () => {
    wrapper = mount(<UserActionAvatar />);
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().exists()).toBeFalsy();
    expect(
      wrapper.find(`[data-test-subj="user-action-avatar-loading-spinner"]`).first().exists()
    ).toBeTruthy();
  });
});
