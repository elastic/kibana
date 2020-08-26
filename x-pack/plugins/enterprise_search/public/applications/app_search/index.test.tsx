/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../__mocks__/shallow_usecontext.mock';
import '../__mocks__/kea.mock';

import React, { useContext } from 'react';
import { Redirect } from 'react-router-dom';
import { shallow } from 'enzyme';
import { useValues, useActions } from 'kea';

import { Layout, SideNav, SideNavLink } from '../shared/layout';
import { SetupGuide } from './components/setup_guide';
import { ErrorConnecting } from './components/error_connecting';
import { EngineOverview } from './components/engine_overview';
import { AppSearch, AppSearchUnconfigured, AppSearchConfigured, AppSearchNav } from './';

describe('AppSearch', () => {
  it('renders AppSearchUnconfigured when config.host is not set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: '' } }));
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(AppSearchUnconfigured)).toHaveLength(1);
  });

  it('renders AppSearchConfigured when config.host set', () => {
    (useContext as jest.Mock).mockImplementationOnce(() => ({ config: { host: 'some.url' } }));
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
    (useValues as jest.Mock).mockImplementation(() => ({}));
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData: () => {} }));
  });

  it('renders with layout', () => {
    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(Layout)).toHaveLength(1);
    expect(wrapper.find(EngineOverview)).toHaveLength(1);
  });

  it('initializes app data with passed props', () => {
    const initializeAppData = jest.fn();
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData }));

    shallow(<AppSearchConfigured readOnlyMode={true} />);

    expect(initializeAppData).toHaveBeenCalledWith({ readOnlyMode: true });
  });

  it('does not re-initialize app data', () => {
    const initializeAppData = jest.fn();
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData }));
    (useValues as jest.Mock).mockImplementation(() => ({ hasInitialized: true }));

    shallow(<AppSearchConfigured />);

    expect(initializeAppData).not.toHaveBeenCalled();
  });

  it('renders ErrorConnecting', () => {
    (useValues as jest.Mock).mockImplementation(() => ({ errorConnecting: true }));

    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
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
