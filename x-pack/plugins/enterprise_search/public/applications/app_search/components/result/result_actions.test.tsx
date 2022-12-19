/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonIcon, EuiButtonIconProps } from '@elastic/eui';

import { ResultActions } from './result_actions';

describe('ResultActions', () => {
  const actions = [
    {
      title: 'Hide',
      onClick: jest.fn(),
      iconType: 'eyeClosed',
      iconColor: 'danger' as EuiButtonIconProps['color'],
    },
    {
      title: 'Bookmark',
      onClick: jest.fn(),
      iconType: 'starFilled',
      iconColor: undefined,
    },
  ];

  const wrapper = shallow(<ResultActions actions={actions} />);
  const buttons = wrapper.find(EuiButtonIcon);

  it('renders an action button for each action passed', () => {
    expect(buttons).toHaveLength(2);
  });

  it('passes icon props correctly', () => {
    expect(buttons.first().prop('iconType')).toEqual('eyeClosed');
    expect(buttons.first().prop('color')).toEqual('danger');

    expect(buttons.last().prop('iconType')).toEqual('starFilled');
    // Note that no iconColor was passed so it was defaulted to primary
    expect(buttons.last().prop('color')).toEqual('primary');
  });

  it('passes click events', () => {
    buttons.first().simulate('click');
    expect(actions[0].onClick).toHaveBeenCalled();

    buttons.last().simulate('click');
    expect(actions[1].onClick).toHaveBeenCalled();
  });
});
