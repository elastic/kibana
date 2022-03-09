/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { UserActionPropertyActions } from './property_actions';

jest.mock('../../common/lib/kibana');

const onEdit = jest.fn();
const onQuote = jest.fn();
const props = {
  commentMarkdown: '',
  id: 'property-actions-id',
  editLabel: 'edit',
  quoteLabel: 'quote',
  disabled: false,
  isLoading: false,
  onEdit,
  onQuote,
  userCanCrud: true,
};

describe('UserActionPropertyActions ', () => {
  let wrapper: ReactWrapper;

  beforeAll(() => {
    wrapper = mount(<UserActionPropertyActions {...props} />);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('quote click calls onQuote', async () => {
    wrapper.find('[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    wrapper.find('[data-test-subj="property-actions-quote"]').first().simulate('click');
    expect(onQuote).toHaveBeenCalledWith(props.id);
  });

  it('pencil click calls onEdit', async () => {
    wrapper.find('[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    wrapper.find('[data-test-subj="property-actions-pencil"]').first().simulate('click');
    expect(onEdit).toHaveBeenCalledWith(props.id);
  });

  it('it shows the spinner when loading', async () => {
    wrapper = mount(<UserActionPropertyActions {...props} isLoading={true} />);
    expect(
      wrapper.find('[data-test-subj="user-action-title-loading"]').first().exists()
    ).toBeTruthy();

    expect(wrapper.find('[data-test-subj="property-actions"]').first().exists()).toBeFalsy();
  });
});
