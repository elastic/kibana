/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionPropertyActions } from './user_action_property_actions';

const props = {
  id: 'property-actions-id',
  editLabel: 'edit',
  quoteLabel: 'quote',
  disabled: false,
  isLoading: false,
  onEdit: jest.fn(),
  onQuote: jest.fn(),
};

describe('UserActionPropertyActions ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionPropertyActions {...props} />);
  });

  it('it renders', async () => {
    expect(
      wrapper.find('[data-test-subj="user-action-title-loading"]').first().exists()
    ).toBeFalsy();

    expect(wrapper.find('[data-test-subj="property-actions"]').first().exists()).toBeTruthy();
  });

  it('it shows the edit and quote buttons', async () => {
    wrapper.find('[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    wrapper.find('[data-test-subj="property-actions-pencil"]').exists();
    wrapper.find('[data-test-subj="property-actions-quote"]').exists();
  });

  it('it shows the spinner when loading', async () => {
    wrapper = mount(<UserActionPropertyActions {...props} isLoading={true} />);
    expect(
      wrapper.find('[data-test-subj="user-action-title-loading"]').first().exists()
    ).toBeTruthy();

    expect(wrapper.find('[data-test-subj="property-actions"]').first().exists()).toBeFalsy();
  });
});
