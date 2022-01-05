/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { HostIsolationCommentEvent } from './host_isolation_event';

const defaultProps = () => {
  return {
    type: 'isolate',
    endpoints: [{ endpointId: 'e1', hostname: 'host1' }],
    href: jest.fn(),
    onClick: jest.fn(),
  };
};

describe('UserActionHostIsolationCommentEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the correct action and hostname', async () => {
    const wrapper = mount(<HostIsolationCommentEvent {...defaultProps()} />);
    expect(wrapper.find(`[data-test-subj="actions-link-e1"]`).first().exists()).toBeTruthy();
    expect(wrapper.text()).toBe('submitted isolate request on host host1');
  });

  it('navigates to app on link click', async () => {
    const onActionsLinkClick = jest.fn();

    const wrapper = mount(
      <HostIsolationCommentEvent {...defaultProps()} onClick={onActionsLinkClick} />
    );

    wrapper.find(`[data-test-subj="actions-link-e1"]`).first().simulate('click');
    expect(onActionsLinkClick).toHaveBeenCalled();
  });
});
