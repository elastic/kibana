/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { Link } from './link';

describe('Link', () => {
  it('renders <a> tag when there is a path', () => {
    const wrapper = mount(<Link copy={'test'} path={'/path'} />);

    expect(wrapper.exists('a')).toEqual(true);
    expect(wrapper.find('a').hostNodes().props().href).toEqual('/path');
    expect(wrapper.find('a').hostNodes().text()).toEqual('test(opens in a new tab or window)');
  });

  it('does not render <a> tag when there is no path', () => {
    const wrapper = mount(<Link copy={'test'} />);

    expect(wrapper.exists('a')).toEqual(false);
    expect(wrapper.find('div').hostNodes().at(0).text()).toEqual('test');
  });
});
