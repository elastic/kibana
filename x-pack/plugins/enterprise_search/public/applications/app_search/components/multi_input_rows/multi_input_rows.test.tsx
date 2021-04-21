/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues, rerender } from '../../../__mocks__';
import '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { InputRow } from './input_row';

jest.mock('./multi_input_rows_logic', () => ({
  MultiInputRowsLogic: jest.fn(),
}));
import { MultiInputRowsLogic } from './multi_input_rows_logic';

import { MultiInputRows } from './';

describe('MultiInputRows', () => {
  const props = {
    id: 'test',
  };
  const values = {
    values: ['a', 'b', 'c'],
    addedNewRow: false,
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

  it('initializes MultiInputRowsLogic with a keyed ID and initialValues', () => {
    shallow(<MultiInputRows id="lorem" initialValues={['ipsum']} />);
    expect(MultiInputRowsLogic).toHaveBeenCalledWith({ id: 'lorem', values: ['ipsum'] });
  });

  it('renders a InputRow row for each value', () => {
    const wrapper = shallow(<MultiInputRows {...props} />);

    expect(wrapper.find(InputRow)).toHaveLength(3);
    expect(wrapper.find(InputRow).at(0).prop('value')).toEqual('a');
    expect(wrapper.find(InputRow).at(1).prop('value')).toEqual('b');
    expect(wrapper.find(InputRow).at(2).prop('value')).toEqual('c');
  });

  it('focuses the first input row on load, but focuses new input rows on add', () => {
    setMockValues({ ...values, addedNewRow: false });
    const wrapper = shallow(<MultiInputRows {...props} />);

    expect(wrapper.find(InputRow).first().prop('autoFocus')).toEqual(true);
    expect(wrapper.find(InputRow).last().prop('autoFocus')).toEqual(false);

    setMockValues({ ...values, addedNewRow: true });
    rerender(wrapper);

    expect(wrapper.find(InputRow).first().prop('autoFocus')).toEqual(false);
    expect(wrapper.find(InputRow).last().prop('autoFocus')).toEqual(true);
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

  describe('onSubmit', () => {
    const onSubmit = jest.fn();

    it('does not render the submit button if onSubmit is not passed', () => {
      const wrapper = shallow(<MultiInputRows {...props} />);
      expect(wrapper.find('[data-test-subj="submitInputValuesButton"]').exists()).toBe(false);
    });

    it('calls the passed onSubmit callback when the submit button is clicked', () => {
      setMockValues({ ...values, values: ['some value'] });
      const wrapper = shallow(<MultiInputRows {...props} onSubmit={onSubmit} />);
      wrapper.find('[data-test-subj="submitInputValuesButton"]').simulate('click');

      expect(onSubmit).toHaveBeenCalledWith(['some value']);
    });

    it('disables the submit button if no value fields have been filled', () => {
      setMockValues({
        ...values,
        values: [''],
        hasOnlyOneValue: true,
        hasEmptyValues: true,
      });
      const wrapper = shallow(<MultiInputRows {...props} onSubmit={onSubmit} />);
      const button = wrapper.find('[data-test-subj="submitInputValuesButton"]');

      expect(button.prop('isDisabled')).toEqual(true);
    });
  });

  describe('onChange', () => {
    const onChange = jest.fn();

    it('returns the current values dynamically on change', () => {
      const wrapper = shallow(<MultiInputRows {...props} onChange={onChange} />);
      setMockValues({ ...values, values: ['updated'] });
      rerender(wrapper);

      expect(onChange).toHaveBeenCalledWith(['updated']);
    });
  });
});
