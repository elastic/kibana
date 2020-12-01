/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFlyoutFooter, EuiButtonEmpty } from '@elastic/eui';

import { CredentialsFlyoutFooter } from './footer';

describe('CredentialsFlyoutFooter', () => {
  const values = {
    activeApiTokenExists: false,
  };
  const actions = {
    hideCredentialsForm: jest.fn(),
    onApiTokenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<CredentialsFlyoutFooter />);
    expect(wrapper.find(EuiFlyoutFooter)).toHaveLength(1);
  });

  it('closes the flyout', () => {
    const wrapper = shallow(<CredentialsFlyoutFooter />);
    const button = wrapper.find(EuiButtonEmpty);
    button.simulate('click');
    expect(button.prop('children')).toEqual('Close');
    expect(actions.hideCredentialsForm).toHaveBeenCalled();
  });

  it('renders action button text for new tokens', () => {
    const wrapper = shallow(<CredentialsFlyoutFooter />);
    const button = wrapper.find('[data-test-subj="APIKeyActionButton"]');

    expect(button.prop('children')).toEqual('Save');
  });

  it('renders action button text for existing tokens', () => {
    setMockValues({ activeApiTokenExists: true });
    const wrapper = shallow(<CredentialsFlyoutFooter />);
    const button = wrapper.find('[data-test-subj="APIKeyActionButton"]');

    expect(button.prop('children')).toEqual('Update');
  });

  it('calls onApiTokenChange on action button press', () => {
    const wrapper = shallow(<CredentialsFlyoutFooter />);
    const button = wrapper.find('[data-test-subj="APIKeyActionButton"]');
    button.simulate('click');

    expect(actions.onApiTokenChange).toHaveBeenCalled();
  });
});
