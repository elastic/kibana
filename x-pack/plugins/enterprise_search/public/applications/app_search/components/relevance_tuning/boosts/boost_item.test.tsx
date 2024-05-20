/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiAccordion } from '@elastic/eui';

import { BoostIcon, ValueBadge } from '../components';
import { BoostType } from '../types';

import { BoostItem } from './boost_item';
import { BoostItemContent } from './boost_item_content';

describe('BoostItem', () => {
  const boost = {
    factor: 2,
    type: BoostType.Value,
    newBoost: true,
    value: [''],
  };

  let wrapper: ShallowWrapper;
  let accordian: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<BoostItem id="some_id" boost={boost} index={1} name="foo" />);
    accordian = wrapper.find(EuiAccordion) as ShallowWrapper;
  });

  it('renders an accordion as open if it is a newly created boost', () => {
    expect(accordian.prop('initialIsOpen')).toEqual(boost.newBoost);
  });

  it('renders an accordion button which shows a summary of the boost', () => {
    const buttonContent = shallow(
      accordian.prop('buttonContent') as React.ReactElement
    ) as ShallowWrapper;

    expect(buttonContent.find(BoostIcon).prop('type')).toEqual('value');
    expect(buttonContent.find(ValueBadge).children().text()).toEqual('2');
  });

  it('renders boost content inside of the accordion', () => {
    const content = wrapper.find(BoostItemContent);
    expect(content.props()).toEqual({
      boost,
      index: 1,
      name: 'foo',
    });
  });
});
