/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton, EuiButtonIcon, EuiFieldText } from '@elastic/eui';

import { ValueBoost, BoostType } from '../../types';

import { ValueBoostForm } from './value_boost_form';

describe('ValueBoostForm', () => {
  const boost: ValueBoost = {
    operation: undefined,
    function: undefined,
    factor: 2,
    type: 'value' as BoostType,
    value: ['bar', '', 'baz'],
  };

  const actions = {
    removeBoostValue: jest.fn(),
    updateBoostValue: jest.fn(),
    addBoostValue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  const valueInput = (wrapper: ShallowWrapper, index: number) =>
    wrapper.find(EuiFieldText).at(index);
  const removeButton = (wrapper: ShallowWrapper, index: number) =>
    wrapper.find(EuiButtonIcon).at(index);
  const addButton = (wrapper: ShallowWrapper) => wrapper.find(EuiButton);

  it('renders a text input for each value from the boost', () => {
    const wrapper = shallow(<ValueBoostForm boost={boost} index={3} name="foo" />);
    expect(valueInput(wrapper, 0).prop('value')).toEqual('bar');
    expect(valueInput(wrapper, 1).prop('value')).toEqual('');
    expect(valueInput(wrapper, 2).prop('value')).toEqual('baz');
  });

  it('updates the corresponding value in state whenever a user changes the value in a text input', () => {
    const wrapper = shallow(<ValueBoostForm boost={boost} index={3} name="foo" />);

    valueInput(wrapper, 2).simulate('change', { target: { value: 'new value' } });

    expect(actions.updateBoostValue).toHaveBeenCalledWith('foo', 3, 2, 'new value');
  });

  it('deletes a boost value when the Remove Value button is clicked', () => {
    const wrapper = shallow(<ValueBoostForm boost={boost} index={3} name="foo" />);

    removeButton(wrapper, 2).simulate('click');

    expect(actions.removeBoostValue).toHaveBeenCalledWith('foo', 3, 2);
  });

  it('adds a new boost value when the Add Value is button clicked', () => {
    const wrapper = shallow(<ValueBoostForm boost={boost} index={3} name="foo" />);

    addButton(wrapper).simulate('click');

    expect(actions.addBoostValue).toHaveBeenCalledWith('foo', 3);
  });
});
