/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { ErrorsPopover } from './errors_popover';

describe('ErrorsPopover', () => {
  let mockErrors: string[];

  beforeEach(() => {
    mockErrors = [];
  });

  it('renders correctly', () => {
    const wrapper = shallow(<ErrorsPopover errors={mockErrors} />);

    expect(wrapper.find('[data-test-subj="eql-validation-errors-popover"]')).toHaveLength(1);
  });

  it('renders the number of errors by default', () => {
    mockErrors = ['error', 'other', 'third'];
    const wrapper = mount(<ErrorsPopover errors={mockErrors} />);
    expect(
      wrapper.find('[data-test-subj="eql-validation-errors-popover"]').first().text()
    ).toContain('3');
  });

  it('renders the error messages if clicked', () => {
    mockErrors = ['error', 'other'];
    const wrapper = mount(<ErrorsPopover errors={mockErrors} />);
    wrapper
      .find('[data-test-subj="eql-validation-errors-popover-button"]')
      .first()
      .simulate('click');

    expect(
      wrapper.find('[data-test-subj="eql-validation-errors-popover"]').first().text()
    ).toContain('2');
    const messagesContent = wrapper
      .find('[data-test-subj="eql-validation-errors-popover-content"]')
      .text();
    expect(messagesContent).toContain('error');
    expect(messagesContent).toContain('other');
  });
});
