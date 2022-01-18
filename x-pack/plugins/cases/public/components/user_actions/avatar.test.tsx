/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionAvatar } from './avatar';

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
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().text()).toBe('E');
  });

  it('it shows the username if the fullName is undefined', async () => {
    wrapper = mount(<UserActionAvatar username={'elastic'} />);
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().text()).toBe('e');
  });

  it('shows unknown when the username AND the fullName are undefined', async () => {
    wrapper = mount(<UserActionAvatar />);
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="user-action-avatar"]`).first().text()).toBe('U');
  });
});
