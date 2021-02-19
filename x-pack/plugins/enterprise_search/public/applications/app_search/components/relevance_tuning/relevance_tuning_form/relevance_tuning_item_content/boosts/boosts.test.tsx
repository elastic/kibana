/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSuperSelect } from '@elastic/eui';

import { SchemaTypes } from '../../../../../../shared/types';

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
    type: 'number' as SchemaTypes,
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
          type: 'text' as SchemaTypes,
        }}
      />
    );

    const select = wrapper.find(EuiSuperSelect);
    expect(select.prop('options').map((o: any) => o.value)).toEqual(['add-boost', 'value']);
  });

  it('will add a boost of the selected type when a selection is made', () => {
    const wrapper = shallow(<Boosts {...props} />);

    wrapper.find(EuiSuperSelect).simulate('change', 'functional');

    expect(actions.addBoost).toHaveBeenCalledWith('foo', 'functional');
  });
});
