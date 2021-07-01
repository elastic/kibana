/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { HostIsolationCommentEvent } from './user_action_host_isolation_comment_event';

const props = {
  type: 'isolate',
  endpoints: [{ endpointId: 'e1', hostname: 'hostess1' }],
  href: jest.fn(),
  onClick: jest.fn(),
};

describe('UserActionHostIsolationCommentEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const wrapper = mount(<HostIsolationCommentEvent {...props} />);
    expect(wrapper.find(`[data-test-subj="actions-link-e1"]`).first().exists()).toBeTruthy();
    expect(wrapper.text()).toBe('isolated host hostess1');
  });

  it('navigates to app on link click', async () => {
    const onActionsLinkClick = jest.fn();

    const wrapper = mount(<HostIsolationCommentEvent {...props} onClick={onActionsLinkClick} />);

    wrapper.find(`[data-test-subj="actions-link-e1"]`).first().simulate('click');
    expect(onActionsLinkClick).toHaveBeenCalled();
  });
});
