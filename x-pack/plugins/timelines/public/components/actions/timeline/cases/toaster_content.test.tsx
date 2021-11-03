/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ToasterContent } from './toaster_content';

describe('ToasterContent', () => {
  const onViewCaseClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with syncAlerts=true', () => {
    const wrapper = mount(
      <ToasterContent caseId="case-id" syncAlerts={true} onViewCaseClick={onViewCaseClick} />
    );

    expect(wrapper.find('[data-test-subj="toaster-content-case-view-link"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="toaster-content-sync-text"]').exists()).toBeTruthy();
  });

  it('renders with syncAlerts=false', () => {
    const wrapper = mount(
      <ToasterContent caseId="case-id" syncAlerts={false} onViewCaseClick={onViewCaseClick} />
    );

    expect(wrapper.find('[data-test-subj="toaster-content-case-view-link"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="toaster-content-sync-text"]').exists()).toBeFalsy();
  });

  it('calls onViewCaseClick', () => {
    const wrapper = mount(
      <ToasterContent caseId="case-id" syncAlerts={false} onViewCaseClick={onViewCaseClick} />
    );

    wrapper.find('[data-test-subj="toaster-content-case-view-link"]').first().simulate('click');
    expect(onViewCaseClick).toHaveBeenCalled();
  });
});
