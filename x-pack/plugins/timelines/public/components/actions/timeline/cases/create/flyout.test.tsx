/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CreateCaseFlyout } from './flyout';
import { TestProviders } from '../../../../../mock';

const onCloseFlyout = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onCloseFlyout,
  onSuccess,
  appId: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj='create-case-flyout']`).exists()).toBeTruthy();
  });

  it('Closing modal calls onCloseCaseModal', () => {
    const wrapper = mount(
      <TestProviders>
        <CreateCaseFlyout {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj='euiFlyoutCloseButton']`).first().simulate('click');
    expect(onCloseFlyout).toBeCalled();
  });
});
