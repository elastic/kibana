/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { MultiInputRows } from '../../../multi_input_rows';

import { ValueBoost, BoostType } from '../../types';

import { ValueBoostForm } from './value_boost_form';

describe('ValueBoostForm', () => {
  const boost: ValueBoost = {
    operation: undefined,
    function: undefined,
    factor: 2,
    type: 'value' as BoostType,
    value: [],
  };

  const actions = {
    updateBoostValue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<ValueBoostForm boost={boost} index={3} name="foo" />);
    expect(wrapper.find(MultiInputRows).exists()).toBe(true);
  });

  it('updates the boost value whenever the MultiInputRows form component updates', () => {
    const wrapper = shallow(<ValueBoostForm boost={boost} index={3} name="foo" />);
    wrapper.find(MultiInputRows).simulate('change', ['bar', 'baz']);

    expect(actions.updateBoostValue).toHaveBeenCalledWith('foo', 3, ['bar', 'baz']);
  });
});
