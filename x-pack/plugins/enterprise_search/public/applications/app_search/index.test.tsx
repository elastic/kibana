/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_usecontext.mock';

import React, { useContext } from 'react';
import { Redirect } from 'react-router-dom';
import { shallow } from 'enzyme';

import { Layout, SideNav, SideNavLink } from '../shared/layout';
import { AppSearch, AppSearchNav } from './';

describe('AppSearch', () => {
  it('renders', () => {
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(Layout)).toHaveLength(1);
  });

  it('redirects to Setup Guide when config.host is not set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: '' } }));
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(Redirect)).toHaveLength(1);
    expect(wrapper.find(Layout)).toHaveLength(0);
  });
});

describe('AppSearchNav', () => {
  it('renders', () => {
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNav)).toHaveLength(1);
    expect(wrapper.find(SideNavLink).first().prop('to')).toEqual('/engines');
    expect(wrapper.find(SideNavLink).last().prop('to')).toEqual(
      'http://localhost:3002/as#/role-mappings'
    );
  });
});
