/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiRange } from '@elastic/eui';

import { WeightSlider } from './weight_slider';

describe('WeightSlider', () => {
  let wrapper: ShallowWrapper;

  const actions = {
    updateFieldWeight: jest.fn(),
  };

  beforeAll(() => {
    setMockActions(actions);
    wrapper = shallow(
      <WeightSlider
        name="foo"
        field={{
          weight: 2.2,
        }}
      />
    );
  });

  it('renders with an initial value set', () => {
    expect(wrapper.find(EuiRange).exists()).toBe(true);
    expect(wrapper.find(EuiRange).prop('value')).toBe(2.2);
  });

  it('updates field weight in state when the value changes', () => {
    wrapper.find(EuiRange).simulate('change', {
      target: {
        value: '1.3',
      },
    });
    expect(actions.updateFieldWeight).toHaveBeenCalledWith('foo', 1.3);
  });
});
