/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge, EuiToolTip } from '@elastic/eui';

import { TagsList, TagsCount } from './tags';

describe('TagsList', () => {
  it('renders', () => {
    const wrapper = shallow(<TagsList tags={['test']} />);

    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('test');
  });

  it('renders >2 badges in a tooltip list', () => {
    const wrapper = shallow(<TagsList tags={['1', '2', '3', '4', '5']} />);

    expect(wrapper.find(EuiBadge)).toHaveLength(3);
    expect(wrapper.find(EuiToolTip)).toHaveLength(1);

    expect(wrapper.find(EuiBadge).at(0).prop('children')).toEqual('1');
    expect(wrapper.find(EuiBadge).at(1).prop('children')).toEqual('2');
    expect(wrapper.find(EuiBadge).at(2).prop('children')).toEqual('and 3 more');
    expect(wrapper.find(EuiToolTip).prop('content')).toEqual('3, 4, 5');
  });

  it('does not render if missing tags', () => {
    const wrapper = shallow(<TagsList tags={[]} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});

describe('TagsCount', () => {
  it('renders a count and all tags in a tooltip', () => {
    const wrapper = shallow(<TagsCount tags={['1', '2', '3']} />);

    expect(wrapper.find(EuiToolTip)).toHaveLength(1);
    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('3 tags');
    expect(wrapper.find(EuiToolTip).prop('content')).toEqual('1, 2, 3');
  });

  it('handles pluralization correctly', () => {
    const wrapper = shallow(<TagsCount tags={['1']} />);

    expect(wrapper.find(EuiToolTip)).toHaveLength(1);
    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('1 tag');
    expect(wrapper.find(EuiToolTip).prop('content')).toEqual('1');
  });

  it('does not render if missing tags', () => {
    const wrapper = shallow(<TagsCount tags={[]} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
