/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText } from '@elastic/eui';

import { InputRow } from './input_row';

describe('InputRow', () => {
  const props = {
    value: 'some value',
    placeholder: 'Enter a value',
    autoFocus: false,
    onChange: jest.fn(),
    onDelete: jest.fn(),
    disableDelete: false,
    deleteLabel: 'Delete value',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<InputRow {...props} />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    expect(wrapper.find(EuiFieldText).prop('value')).toEqual('some value');
    expect(wrapper.find(EuiFieldText).prop('placeholder')).toEqual('Enter a value');
    expect(wrapper.find(EuiFieldText).prop('autoFocus')).toEqual(false);
    expect(wrapper.find('[data-test-subj="deleteInputRowButton"]').prop('title')).toEqual(
      'Delete value'
    );
  });

  it('calls onChange when the input value changes', () => {
    const wrapper = shallow(<InputRow {...props} />);
    wrapper.find(EuiFieldText).simulate('change', { target: { value: 'new value' } });

    expect(props.onChange).toHaveBeenCalledWith('new value');
  });

  it('calls onDelete when the delete button is clicked', () => {
    const wrapper = shallow(<InputRow {...props} />);
    wrapper.find('[data-test-subj="deleteInputRowButton"]').simulate('click');

    expect(props.onDelete).toHaveBeenCalled();
  });

  it('disables the delete button if disableDelete is passed', () => {
    const wrapper = shallow(<InputRow {...props} disableDelete />);
    const button = wrapper.find('[data-test-subj="deleteInputRowButton"]');

    expect(button.prop('isDisabled')).toEqual(true);
  });
});
