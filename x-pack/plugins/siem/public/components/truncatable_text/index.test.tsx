/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TruncatableText } from '.';

describe('TruncatableText', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<TruncatableText>{'Hiding in plain sight'}</TruncatableText>);
    expect(wrapper).toMatchSnapshot();
  });

  test('it adds the hidden overflow style', () => {
    const wrapper = mount(<TruncatableText>{'Hiding in plain sight'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('overflow', 'hidden');
  });

  test('it adds the ellipsis text-overflow style', () => {
    const wrapper = mount(<TruncatableText>{'Dramatic pause'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('text-overflow', 'ellipsis');
  });

  test('it adds the nowrap white-space style', () => {
    const wrapper = mount(<TruncatableText>{'Who stopped the beats?'}</TruncatableText>);

    expect(wrapper).toHaveStyleRule('white-space', 'nowrap');
  });
});
