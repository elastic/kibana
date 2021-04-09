/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { InputRow } from './input_row';

import { MultiInputRows } from './';

describe('MultiInputRows', () => {
  const props = {
    values: ['a', 'b', 'c'],
    onSubmit: jest.fn(),
  };
  const values = {
    values: ['a', 'b', 'c'],
    hasEmptyValues: false,
    hasOnlyOneValue: false,
  };
  const actions = {
    addValue: jest.fn(),
    editValue: jest.fn(),
    deleteValue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a InputRow row for each value', () => {
    const wrapper = shallow(<MultiInputRows {...props} />);

    expect(wrapper.find(InputRow)).toHaveLength(3);
    expect(wrapper.find(InputRow).at(0).prop('value')).toEqual('a');
    expect(wrapper.find(InputRow).at(1).prop('value')).toEqual('b');
    expect(wrapper.find(InputRow).at(2).prop('value')).toEqual('c');
  });

  it('calls editValue when the InputRow value changes', () => {
    const wrapper = shallow(<MultiInputRows {...props} />);
    wrapper.find(InputRow).at(0).simulate('change', 'new value');

    expect(actions.editValue).toHaveBeenCalledWith(0, 'new value');
  });

  it('calls deleteValue when the InputRow calls onDelete', () => {
    const wrapper = shallow(<MultiInputRows {...props} />);
    wrapper.find(InputRow).at(2).simulate('delete');

    expect(actions.deleteValue).toHaveBeenCalledWith(2);
  });

  it('calls addValue when the Add Value button is clicked', () => {
    const wrapper = shallow(<MultiInputRows {...props} />);
    wrapper.find('[data-test-subj="addInputRowButton"]').simulate('click');

    expect(actions.addValue).toHaveBeenCalled();
  });

  it('disables the add button if any value fields are empty', () => {
    setMockValues({
      ...values,
      values: ['a', '', 'c'],
      hasEmptyValues: true,
    });
    const wrapper = shallow(<MultiInputRows {...props} />);
    const button = wrapper.find('[data-test-subj="addInputRowButton"]');

    expect(button.prop('isDisabled')).toEqual(true);
  });

  it('calls the passed onSubmit callback when the submit button is clicked', () => {
    setMockValues({ ...values, values: ['some value'] });
    const wrapper = shallow(<MultiInputRows {...props} />);
    wrapper.find('[data-test-subj="submitInputValuesButton"]').simulate('click');

    expect(props.onSubmit).toHaveBeenCalledWith(['some value']);
  });

  it('disables the submit button if no value fields have been filled', () => {
    setMockValues({
      ...values,
      values: [''],
      hasOnlyOneValue: true,
      hasEmptyValues: true,
    });
    const wrapper = shallow(<MultiInputRows {...props} />);
    const button = wrapper.find('[data-test-subj="submitInputValuesButton"]');

    expect(button.prop('isDisabled')).toEqual(true);
  });
});
