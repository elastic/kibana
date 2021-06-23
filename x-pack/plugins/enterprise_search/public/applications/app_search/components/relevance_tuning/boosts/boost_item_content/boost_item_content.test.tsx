/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiRange } from '@elastic/eui';

import { BoostType } from '../../types';

import { BoostItemContent } from './boost_item_content';
import { FunctionalBoostForm } from './functional_boost_form';
import { ProximityBoostForm } from './proximity_boost_form';
import { ValueBoostForm } from './value_boost_form';

describe('BoostItemContent', () => {
  const actions = {
    updateBoostFactor: jest.fn(),
    deleteBoost: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  it('renders a value boost form if the provided boost is "value" boost', () => {
    const boost = {
      factor: 2,
      type: 'value' as BoostType,
      value: [''],
    };

    const wrapper = shallow(<BoostItemContent boost={boost} index={3} name="foo" />);

    expect(wrapper.find(ValueBoostForm).exists()).toBe(true);
    expect(wrapper.find(FunctionalBoostForm).exists()).toBe(false);
    expect(wrapper.find(ProximityBoostForm).exists()).toBe(false);
  });

  it('renders a functional boost form if the provided boost is "functional" boost', () => {
    const boost = {
      factor: 10,
      type: 'functional' as BoostType,
    };

    const wrapper = shallow(<BoostItemContent boost={boost} index={3} name="foo" />);

    expect(wrapper.find(ValueBoostForm).exists()).toBe(false);
    expect(wrapper.find(FunctionalBoostForm).exists()).toBe(true);
    expect(wrapper.find(ProximityBoostForm).exists()).toBe(false);
  });

  it('renders a proximity boost form if the provided boost is "proximity" boost', () => {
    const boost = {
      factor: 8,
      type: 'proximity' as BoostType,
    };

    const wrapper = shallow(<BoostItemContent boost={boost} index={3} name="foo" />);

    expect(wrapper.find(ValueBoostForm).exists()).toBe(false);
    expect(wrapper.find(FunctionalBoostForm).exists()).toBe(false);
    expect(wrapper.find(ProximityBoostForm).exists()).toBe(true);
  });

  it("renders an impact slider that can be used to update the boost's 'factor'", () => {
    const boost = {
      factor: 8,
      type: 'proximity' as BoostType,
    };

    const wrapper = shallow(<BoostItemContent boost={boost} index={3} name="foo" />);
    const impactSlider = wrapper.find(EuiRange);
    expect(impactSlider.prop('value')).toBe(8);

    impactSlider.simulate('change', { target: { value: '2' } });

    expect(actions.updateBoostFactor).toHaveBeenCalledWith('foo', 3, 2);
  });

  it("will delete the current boost if the 'Delete boost' button is clicked", () => {
    const boost = {
      factor: 8,
      type: 'proximity' as BoostType,
    };

    const wrapper = shallow(<BoostItemContent boost={boost} index={3} name="foo" />);
    wrapper.find(EuiButton).simulate('click');

    expect(actions.deleteBoost).toHaveBeenCalledWith('foo', 3);
  });
});
