/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSuperSelect } from '@elastic/eui';

import { SchemaType } from '../../../../shared/schema/types';

import { BoostType } from '../types';

import { BoostItem } from './boost_item';
import { Boosts } from './boosts';

describe('Boosts', () => {
  const actions = {
    addBoost: jest.fn(),
  };

  beforeAll(() => {
    setMockActions(actions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    name: 'foo',
    type: SchemaType.Number,
  };

  it('renders a select box that allows users to create boosts of various types', () => {
    const wrapper = shallow(<Boosts {...props} />);

    const select = wrapper.find(EuiSuperSelect);
    expect(select.prop('options').map((o: any) => o.value)).toEqual([
      'add-boost',
      'functional',
      'proximity',
      'value',
    ]);
  });

  it('will not render functional or proximity options if "type" prop is "text"', () => {
    const wrapper = shallow(
      <Boosts
        {...{
          ...props,
          type: SchemaType.Text,
        }}
      />
    );

    const select = wrapper.find(EuiSuperSelect);
    expect(select.prop('options').map((o: any) => o.value)).toEqual(['add-boost', 'value']);
  });

  it('will not render functional or value options if "type" prop is "geolocation"', () => {
    const wrapper = shallow(
      <Boosts
        {...{
          ...props,
          type: SchemaType.Geolocation,
        }}
      />
    );

    const select = wrapper.find(EuiSuperSelect);
    expect(select.prop('options').map((o: any) => o.value)).toEqual(['add-boost', 'proximity']);
  });

  it('will not render functional option if "type" prop is "date"', () => {
    const wrapper = shallow(
      <Boosts
        {...{
          ...props,
          type: SchemaType.Date,
        }}
      />
    );

    const select = wrapper.find(EuiSuperSelect);
    expect(select.prop('options').map((o: any) => o.value)).toEqual([
      'add-boost',
      'proximity',
      'value',
    ]);
  });

  it('will add a boost of the selected type when a selection is made', () => {
    const wrapper = shallow(<Boosts {...props} />);

    wrapper.find(EuiSuperSelect).simulate('change', 'functional');

    expect(actions.addBoost).toHaveBeenCalledWith('foo', 'functional');
  });

  it('will render a list of boosts', () => {
    const boost1 = {
      factor: 2,
      type: 'value' as BoostType,
      value: [''],
    };
    const boost2 = {
      factor: 10,
      type: 'functional' as BoostType,
    };
    const boost3 = {
      factor: 8,
      type: 'proximity' as BoostType,
    };

    const wrapper = shallow(
      <Boosts
        {...{
          ...props,
          boosts: [boost1, boost2, boost3],
        }}
      />
    );

    const boostItems = wrapper.find(BoostItem);
    expect(boostItems.at(0).prop('boost')).toEqual(boost1);
    expect(boostItems.at(1).prop('boost')).toEqual(boost2);
    expect(boostItems.at(2).prop('boost')).toEqual(boost3);
  });
});
