/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

import { InlineTagsList } from './inline_tags_list';

describe('InlineTagsList', () => {
  it('renders', () => {
    const wrapper = shallow(<InlineTagsList tags={['test']} />);

    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find(EuiBadge).prop('children')).toEqual('test');
  });

  it('renders >2 badges in a tooltip list', () => {
    const wrapper = shallow(<InlineTagsList tags={['1', '2', '3', '4', '5']} />);

    expect(wrapper.find(EuiBadge)).toHaveLength(3);
    expect(wrapper.find(EuiToolTip)).toHaveLength(1);

    expect(wrapper.find(EuiBadge).at(0).prop('children')).toEqual('1');
    expect(wrapper.find(EuiBadge).at(1).prop('children')).toEqual('2');
    expect(wrapper.find(EuiBadge).at(2).prop('children')).toEqual('and 3 more');
    expect(wrapper.find(EuiToolTip).prop('content')).toEqual('3, 4, 5');
  });

  it('does not render with no tags', () => {
    const wrapper = shallow(<InlineTagsList tags={[]} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
