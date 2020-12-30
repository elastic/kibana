/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_useeffect.mock';
import '../__mocks__/kea.mock';
import '../__mocks__/enterprise_search_url.mock';
import { setMockValues, setMockActions } from '../__mocks__';

import React from 'react';
import { Redirect } from 'react-router-dom';
import { shallow } from 'enzyme';

import { Layout, SideNav, SideNavLink } from '../shared/layout';
import { SetupGuide } from './components/setup_guide';
import { ErrorConnecting } from './components/error_connecting';
import { EnginesOverview } from './components/engines';
import { EngineRouter } from './components/engine';
import { AppSearch, AppSearchUnconfigured, AppSearchConfigured, AppSearchNav } from './';

describe('AppSearch', () => {
  it('renders AppSearchUnconfigured when config.host is not set', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(AppSearchUnconfigured)).toHaveLength(1);
  });

  it('renders AppSearchConfigured when config.host set', () => {
    setMockValues({ config: { host: 'some.url' } });
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(AppSearchConfigured)).toHaveLength(1);
  });
});

describe('AppSearchUnconfigured', () => {
  it('renders the Setup Guide and redirects to the Setup Guide', () => {
    const wrapper = shallow(<AppSearchUnconfigured />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
    expect(wrapper.find(Redirect)).toHaveLength(1);
  });
});

describe('AppSearchConfigured', () => {
  beforeEach(() => {
    // Mock resets
    setMockValues({ myRole: {} });
    setMockActions({ initializeAppData: () => {} });
  });

  it('renders with layout', () => {
    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(Layout)).toHaveLength(2);
    expect(wrapper.find(Layout).last().prop('readOnlyMode')).toBeFalsy();
    expect(wrapper.find(EnginesOverview)).toHaveLength(1);
    expect(wrapper.find(EngineRouter)).toHaveLength(1);
  });

  it('initializes app data with passed props', () => {
    const initializeAppData = jest.fn();
    setMockActions({ initializeAppData });

    shallow(<AppSearchConfigured ilmEnabled={true} />);

    expect(initializeAppData).toHaveBeenCalledWith({ ilmEnabled: true });
  });

  it('does not re-initialize app data', () => {
    const initializeAppData = jest.fn();
    setMockActions({ initializeAppData });
    setMockValues({ myRole: {}, hasInitialized: true });

    shallow(<AppSearchConfigured />);

    expect(initializeAppData).not.toHaveBeenCalled();
  });

  it('renders ErrorConnecting', () => {
    setMockValues({ myRole: {}, errorConnecting: true });

    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
  });

  it('passes readOnlyMode state', () => {
    setMockValues({ myRole: {}, readOnlyMode: true });

    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(Layout).first().prop('readOnlyMode')).toEqual(true);
  });

  describe('ability checks', () => {
    // TODO: Use this section for routes wrapped in canViewX conditionals
    // e.g., it('renders settings if a user can view settings')
  });
});

describe('AppSearchNav', () => {
  it('renders with the Engines link', () => {
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNav)).toHaveLength(1);
    expect(wrapper.find(SideNavLink).prop('to')).toEqual('/engines');
  });

  it('renders an Engine subnav if passed', () => {
    const wrapper = shallow(<AppSearchNav subNav={<div data-test-subj="subnav">Testing</div>} />);
    const link = wrapper.find(SideNavLink).dive();

    expect(link.find('[data-test-subj="subnav"]')).toHaveLength(1);
  });

  it('renders the Settings link', () => {
    setMockValues({ myRole: { canViewSettings: true } });
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).last().prop('to')).toEqual('/settings/account');
  });

  it('renders the Credentials link', () => {
    setMockValues({ myRole: { canViewAccountCredentials: true } });
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).last().prop('to')).toEqual('/credentials');
  });

  it('renders the Role Mappings link', () => {
    setMockValues({ myRole: { canViewRoleMappings: true } });
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).last().prop('to')).toEqual(
      'http://localhost:3002/as#/role-mappings'
    );
  });
});
