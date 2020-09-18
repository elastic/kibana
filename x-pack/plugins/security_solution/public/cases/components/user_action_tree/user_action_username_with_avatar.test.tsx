/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionUsernameWithAvatar } from './user_action_username_with_avatar';

const props = {
  username: 'elastic',
  fullName: 'Elastic',
};

describe('UserActionUsernameWithAvatar ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionUsernameWithAvatar {...props} />);
  });

  it('it renders', async () => {
    expect(
      wrapper.find('[data-test-subj="user-action-username-with-avatar"]').first().exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="user-action-username-avatar"]').first().exists()
    ).toBeTruthy();
  });

  it('it shows the avatar', async () => {
    expect(wrapper.find('[data-test-subj="user-action-username-avatar"]').first().text()).toBe('E');
  });

  it('it shows the avatar without fullName', async () => {
    const newWrapper = mount(<UserActionUsernameWithAvatar username="elastic" />);
    expect(newWrapper.find('[data-test-subj="user-action-username-avatar"]').first().text()).toBe(
      'e'
    );
  });
});
