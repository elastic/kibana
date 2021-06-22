/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiSelect } from '@elastic/eui';

import { FunctionalBoost, BoostOperation, BoostType, FunctionalBoostFunction } from '../../types';

import { FunctionalBoostForm } from './functional_boost_form';

describe('FunctionalBoostForm', () => {
  const boost: FunctionalBoost = {
    value: undefined,
    factor: 2,
    type: 'functional' as BoostType,
    function: 'logarithmic' as FunctionalBoostFunction,
    operation: 'multiply' as BoostOperation,
  };

  const actions = {
    updateBoostSelectOption: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  const functionSelect = (wrapper: ShallowWrapper) => wrapper.find(EuiSelect).at(0);
  const operationSelect = (wrapper: ShallowWrapper) => wrapper.find(EuiSelect).at(1);

  it('renders select boxes with values from the provided boost selected', () => {
    const wrapper = shallow(<FunctionalBoostForm boost={boost} index={3} name="foo" />);
    expect(functionSelect(wrapper).prop('value')).toEqual('logarithmic');
    expect(operationSelect(wrapper).prop('value')).toEqual('multiply');
  });

  it('will update state when a user makes a selection', () => {
    const wrapper = shallow(<FunctionalBoostForm boost={boost} index={3} name="foo" />);

    functionSelect(wrapper).simulate('change', {
      target: {
        value: 'exponential',
      },
    });
    expect(actions.updateBoostSelectOption).toHaveBeenCalledWith(
      'foo',
      3,
      'function',
      'exponential'
    );

    operationSelect(wrapper).simulate('change', {
      target: {
        value: 'add',
      },
    });
    expect(actions.updateBoostSelectOption).toHaveBeenCalledWith('foo', 3, 'operation', 'add');
  });
});
