/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiLink as EuiLinkExternal } from '@elastic/eui';
import { EuiLink } from '../react_router_helpers';
import { ENTERPRISE_SEARCH_PLUGIN, APP_SEARCH_PLUGIN } from '../../../../common/constants';

import { SideNav, SideNavLink } from './';

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
    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find('.enterpriseSearchNavLinks__item')).toHaveLength(1);
  });

  it('renders an external link if isExternal is true', () => {
    const wrapper = shallow(
      <SideNavLink to="http://website.com" isExternal>
        Link
      </SideNavLink>
    );
    const externalLink = wrapper.find(EuiLinkExternal);

    expect(externalLink).toHaveLength(1);
    expect(externalLink.prop('href')).toEqual('http://website.com');
    expect(externalLink.prop('target')).toEqual('_blank');
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
});
