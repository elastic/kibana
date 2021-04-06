/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText } from '@elastic/eui';

import { CurationQuery } from './curation_query';

describe('CurationQuery', () => {
  const props = {
    queryValue: 'some query',
    onChange: jest.fn(),
    onDelete: jest.fn(),
    disableDelete: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<CurationQuery {...props} />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    expect(wrapper.find(EuiFieldText).prop('value')).toEqual('some query');
  });

  it('calls onChange when the input value changes', () => {
    const wrapper = shallow(<CurationQuery {...props} />);
    wrapper.find(EuiFieldText).simulate('change', { target: { value: 'new query value' } });

    expect(props.onChange).toHaveBeenCalledWith('new query value');
  });

  it('calls onDelete when the delete button is clicked', () => {
    const wrapper = shallow(<CurationQuery {...props} />);
    wrapper.find('[data-test-subj="deleteCurationQueryButton"]').simulate('click');

    expect(props.onDelete).toHaveBeenCalled();
  });

  it('disables the delete button if disableDelete is passed', () => {
    const wrapper = shallow(<CurationQuery {...props} disableDelete />);
    const button = wrapper.find('[data-test-subj="deleteCurationQueryButton"]');

    expect(button.prop('isDisabled')).toEqual(true);
  });
});
