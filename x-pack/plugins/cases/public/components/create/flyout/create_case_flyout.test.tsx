/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import { CreateCaseFlyout } from './create_case_flyout';
import { TestProviders } from '../../../common/mock';

const onClose = jest.fn();
const onSuccess = jest.fn();
const defaultProps = {
  onClose,
  onSuccess,
  owner: 'securitySolution',
};

describe('CreateCaseFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <CreateCaseFlyout {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj='create-case-flyout']`).exists()).toBeTruthy();
    });
  });

  it('Closing flyout calls onCloseCaseModal', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <CreateCaseFlyout {...defaultProps} />
        </TestProviders>
      );

      wrapper.find(`[data-test-subj='euiFlyoutCloseButton']`).first().simulate('click');
      expect(onClose).toBeCalled();
    });
  });
});
