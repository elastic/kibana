/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiPageSideBar, EuiButton, EuiPageBody, EuiCallOut } from '@elastic/eui';

import { Layout, INavContext } from './layout';

describe('Layout', () => {
  it('renders', () => {
    const wrapper = shallow(<Layout navigation={null} />);

    expect(wrapper.find('.enterpriseSearchLayout')).toHaveLength(1);
    expect(wrapper.find(EuiPageBody).prop('restrictWidth')).toBeFalsy();
  });

  it('passes the restrictWidth prop', () => {
    const wrapper = shallow(<Layout navigation={null} restrictWidth />);

    expect(wrapper.find(EuiPageBody).prop('restrictWidth')).toEqual(true);
  });

  it('renders navigation', () => {
    const wrapper = shallow(<Layout navigation={<nav className="nav-test">Hello World</nav>} />);

    expect(wrapper.find('.enterpriseSearchLayout__sideBar')).toHaveLength(1);
    expect(wrapper.find('.nav-test')).toHaveLength(1);
  });

  it('renders navigation toggle state', () => {
    const wrapper = shallow(<Layout navigation={<nav className="nav-test">Hello World</nav>} />);
    expect(wrapper.find(EuiPageSideBar).prop('className')).not.toContain('--isOpen');
    expect(wrapper.find(EuiButton).prop('iconType')).toEqual('arrowRight');

    const toggle = wrapper.find('[data-test-subj="enterpriseSearchNavToggle"]');
    toggle.simulate('click');

    expect(wrapper.find(EuiPageSideBar).prop('className')).toContain('--isOpen');
    expect(wrapper.find(EuiButton).prop('iconType')).toEqual('arrowDown');
  });

  it('passes down NavContext to navigation links', () => {
    const wrapper = shallow(<Layout navigation={<nav />} />);

    const toggle = wrapper.find('[data-test-subj="enterpriseSearchNavToggle"]');
    toggle.simulate('click');
    expect(wrapper.find(EuiPageSideBar).prop('className')).toContain('--isOpen');

    const context = (wrapper.find('ContextProvider').prop('value') as unknown) as INavContext;
    context.closeNavigation();
    expect(wrapper.find(EuiPageSideBar).prop('className')).not.toContain('--isOpen');
  });

  it('renders a read-only mode callout', () => {
    const wrapper = shallow(<Layout navigation={null} readOnlyMode={true} />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('renders children', () => {
    const wrapper = shallow(
      <Layout navigation={null}>
        <div className="testing">Test</div>
      </Layout>
    );

    expect(wrapper.find('.enterpriseSearchLayout__body')).toHaveLength(1);
    expect(wrapper.find('.testing')).toHaveLength(1);
  });
});
