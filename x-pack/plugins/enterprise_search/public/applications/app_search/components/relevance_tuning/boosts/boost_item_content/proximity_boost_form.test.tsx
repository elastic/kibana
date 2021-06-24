/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiFieldText, EuiSelect } from '@elastic/eui';

import { ProximityBoost, BoostType, ProximityBoostFunction } from '../../types';

import { ProximityBoostForm } from './proximity_boost_form';

describe('ProximityBoostForm', () => {
  const boost: ProximityBoost = {
    value: undefined,
    operation: undefined,
    factor: 2,
    type: 'proximity' as BoostType,
    function: 'linear' as ProximityBoostFunction,
    center: '2',
  };

  const actions = {
    updateBoostSelectOption: jest.fn(),
    updateBoostCenter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  const functionSelect = (wrapper: ShallowWrapper) => wrapper.find(EuiSelect);
  const centerInput = (wrapper: ShallowWrapper) => wrapper.find(EuiFieldText);

  it('renders input with values from the provided boost', () => {
    const wrapper = shallow(<ProximityBoostForm boost={boost} index={3} name="foo" />);
    expect(functionSelect(wrapper).prop('value')).toEqual('linear');
    expect(centerInput(wrapper).prop('defaultValue')).toEqual('2');
  });

  describe('various boost values', () => {
    const renderWithBoostValues = (boostValues: {
      center?: ProximityBoost['center'];
      function?: ProximityBoost['function'];
    }) => {
      return shallow(
        <ProximityBoostForm
          boost={{
            ...boost,
            ...boostValues,
          }}
          index={3}
          name="foo"
        />
      );
    };

    it('will set the center value as a string if the value is a number', () => {
      const wrapper = renderWithBoostValues({ center: 0 });
      expect(centerInput(wrapper).prop('defaultValue')).toEqual('0');
    });

    it('will set the center value as an empty string if the value is undefined', () => {
      const wrapper = renderWithBoostValues({ center: undefined });
      expect(centerInput(wrapper).prop('defaultValue')).toEqual('');
    });

    it('will set the function to Guaussian if it is not already set', () => {
      const wrapper = renderWithBoostValues({ function: undefined });
      expect(functionSelect(wrapper).prop('value')).toEqual('gaussian');
    });
  });

  it('will update state when a user enters input', () => {
    const wrapper = shallow(<ProximityBoostForm boost={boost} index={3} name="foo" />);

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

    centerInput(wrapper).simulate('change', {
      target: {
        value: '5',
      },
    });
    expect(actions.updateBoostCenter).toHaveBeenCalledWith('foo', 3, '5');
  });
});
