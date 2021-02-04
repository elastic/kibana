/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/react_router_history.mock';

import React from 'react';
import { useLocation } from 'react-router-dom';
import { shallow } from 'enzyme';

import { EuiLink } from '@elastic/eui';
import { EuiLinkTo } from '../react_router_helpers';
import { ENTERPRISE_SEARCH_PLUGIN, APP_SEARCH_PLUGIN } from '../../../../common/constants';

import { SideNav, SideNavLink, SideNavItem } from './';

describe('SideNav', () => {
  it('renders link children', () => {
    const wrapper = shallow(
      <SideNav product={ENTERPRISE_SEARCH_PLUGIN}>
        <div className="testing">Hello World</div>
      </SideNav>
    );

    expect(wrapper.type()).toEqual('nav');
    expect(wrapper.find('.enterpriseSearchNavLinks')).toHaveLength(1);
    expect(wrapper.find('.testing')).toHaveLength(1);
  });

  it('renders a custom product', () => {
    const wrapper = shallow(<SideNav product={APP_SEARCH_PLUGIN} />);

    expect(wrapper.find('h3').text()).toEqual('App Search');
    expect(wrapper.find('.enterpriseSearchProduct--appSearch')).toHaveLength(1);
  });
});

describe('SideNavLink', () => {
  it('renders', () => {
    const wrapper = shallow(<SideNavLink to="/">Link</SideNavLink>);

    expect(wrapper.type()).toEqual('li');
    expect(wrapper.find(EuiLinkTo)).toHaveLength(1);
    expect(wrapper.find('.enterpriseSearchNavLinks__item')).toHaveLength(1);
  });

  it('renders an external link if isExternal is true', () => {
    const wrapper = shallow(
      <SideNavLink to="http://website.com" isExternal>
        Link
      </SideNavLink>
    );
    const externalLink = wrapper.find(EuiLink);

    expect(externalLink).toHaveLength(1);
    expect(externalLink.prop('href')).toEqual('http://website.com');
    expect(externalLink.prop('target')).toEqual('_blank');
  });

  it('sets an active class if the current path matches the nav link', () => {
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ pathname: '/test/' }));

    const wrapper = shallow(<SideNavLink to="/test">Link</SideNavLink>);

    expect(wrapper.find('.enterpriseSearchNavLinks__item--isActive')).toHaveLength(1);
  });

  it('sets an active class if the current path is / and the link isRoot', () => {
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ pathname: '/' }));

    const wrapper = shallow(
      <SideNavLink to="/test" isRoot>
        Link
      </SideNavLink>
    );

    expect(wrapper.find('.enterpriseSearchNavLinks__item--isActive')).toHaveLength(1);
  });

  it('passes down custom classes and props', () => {
    const wrapper = shallow(
      <SideNavLink to="/" className="testing" data-test-subj="testing">
        Link
      </SideNavLink>
    );

    expect(wrapper.find('.testing')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="testing"]')).toHaveLength(1);
  });

  it('renders nested subnavigation', () => {
    const subNav = (
      <SideNavLink to="/elsewhere" data-test-subj="subNav">
        Another link!
      </SideNavLink>
    );
    const wrapper = shallow(
      <SideNavLink to="/" subNav={subNav}>
        Link
      </SideNavLink>
    );

    expect(wrapper.find('.enterpriseSearchNavLinks__subNav')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="subNav"]')).toHaveLength(1);
  });

  describe('shouldShowActiveForSubroutes', () => {
    it("won't set an active class when route is a subroute of 'to'", () => {
      (useLocation as jest.Mock).mockImplementationOnce(() => ({ pathname: '/documents/1234' }));

      const wrapper = shallow(
        <SideNavLink to="/documents" isRoot>
          Link
        </SideNavLink>
      );

      expect(wrapper.find('.enterpriseSearchNavLinks__item--isActive')).toHaveLength(0);
    });

    it('sets an active class if the current path is a subRoute of "to", and shouldShowActiveForSubroutes is true', () => {
      (useLocation as jest.Mock).mockImplementationOnce(() => ({ pathname: '/documents/1234' }));

      const wrapper = shallow(
        <SideNavLink to="/documents" isRoot shouldShowActiveForSubroutes>
          Link
        </SideNavLink>
      );

      expect(wrapper.find('.enterpriseSearchNavLinks__item--isActive')).toHaveLength(1);
    });
  });
});

describe('SideNavItem', () => {
  it('renders', () => {
    const wrapper = shallow(<SideNavItem>Test</SideNavItem>);

    expect(wrapper.type()).toEqual('li');
    expect(wrapper.find('.enterpriseSearchNavLinks__item')).toHaveLength(1);
  });

  it('renders children', () => {
    const wrapper = shallow(
      <SideNavItem>
        <span data-test-subj="hello">World</span>
      </SideNavItem>
    );

    expect(wrapper.find('[data-test-subj="hello"]').text()).toEqual('World');
  });

  it('passes down custom classes and props', () => {
    const wrapper = shallow(
      <SideNavItem className="testing" data-test-subj="testing">
        Test
      </SideNavItem>
    );

    expect(wrapper.find('.testing')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="testing"]')).toHaveLength(1);
  });
});
