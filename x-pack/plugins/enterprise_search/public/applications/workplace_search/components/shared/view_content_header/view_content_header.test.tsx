/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlexGroup } from '@elastic/eui';

import { ViewContentHeader } from '.';

const props = {
  title: 'Header',
  alignItems: 'flexStart' as any,
};

describe('ViewContentHeader', () => {
  it('renders with title and alignItems', () => {
    const wrapper = shallow(<ViewContentHeader {...props} />);

    expect(wrapper.find('h2').text()).toEqual('Header');
    expect(wrapper.find(EuiFlexGroup).prop('alignItems')).toEqual('flexStart');
  });

  it('shows description, when present', () => {
    const wrapper = shallow(<ViewContentHeader title="Header" description="Hello World" />);

    expect(wrapper.find('p').text()).toEqual('Hello World');
    expect(wrapper.find(EuiFlexGroup).prop('alignItems')).toEqual('center');
  });

  it('shows action, when present', () => {
    const wrapper = shallow(<ViewContentHeader {...props} action={<div className="action" />} />);

    expect(wrapper.find('.action')).toHaveLength(1);
  });

  it('renders h1 heading', () => {
    const wrapper = shallow(
      <ViewContentHeader
        titleSize="s"
        {...props}
        headingLevel={1}
        action={<div className="action" />}
      />
    );

    expect(wrapper.find('h1')).toHaveLength(1);
  });

  it('renders h3 heading', () => {
    const wrapper = shallow(
      <ViewContentHeader
        titleSize="s"
        {...props}
        headingLevel={3}
        action={<div className="action" />}
      />
    );

    expect(wrapper.find('h3')).toHaveLength(1);
  });
});
