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
import { NotFound } from '../shared/not_found';
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
    (useValues as jest.Mock).mockImplementation(() => ({ myRole: {} }));
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData: () => {} }));
  });

  it('renders with layout', () => {
    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(Layout)).toHaveLength(1);
    expect(wrapper.find(Layout).prop('readOnlyMode')).toBeFalsy();
  });

  it('initializes app data with passed props', () => {
    const initializeAppData = jest.fn();
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData }));

    shallow(<AppSearchConfigured ilmEnabled={true} />);

    expect(initializeAppData).toHaveBeenCalledWith({ ilmEnabled: true });
  });

  it('does not re-initialize app data', () => {
    const initializeAppData = jest.fn();
    (useActions as jest.Mock).mockImplementation(() => ({ initializeAppData }));
    (useValues as jest.Mock).mockImplementation(() => ({ myRole: {}, hasInitialized: true }));

    shallow(<AppSearchConfigured />);

    expect(initializeAppData).not.toHaveBeenCalled();
  });

  it('renders ErrorConnecting', () => {
    (useValues as jest.Mock).mockImplementation(() => ({ myRole: {}, errorConnecting: true }));

    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
  });

  it('passes readOnlyMode state', () => {
    (useValues as jest.Mock).mockImplementation(() => ({ readOnlyMode: true }));

    const wrapper = shallow(<AppSearchConfigured />);

    expect(wrapper.find(Layout).prop('readOnlyMode')).toEqual(true);
  });

  describe('ability checks', () => {
    it('renders a 404 if a user has no view abilities', () => {
      const wrapper = shallow(<AppSearchConfigured />);

      expect(wrapper.find(NotFound)).toHaveLength(2);
    });

    it('renders the engines overview if a user can view engines', () => {
      (useValues as jest.Mock).mockImplementation(() => ({
        myRole: { canViewEngines: true },
      }));

      const wrapper = shallow(<AppSearchConfigured />);

      expect(wrapper.find(EngineOverview)).toHaveLength(1);
      expect(wrapper.find(NotFound)).toHaveLength(1);
    });
  });
});

describe('AppSearchNav', () => {
  it('renders', () => {
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNav)).toHaveLength(1);
  });

  it('renders the Engines link', () => {
    (useValues as jest.Mock).mockImplementation(() => ({
      myRole: { canViewEngines: true },
    }));
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).prop('to')).toEqual('/engines');
  });

  it('renders the Settings link', () => {
    (useValues as jest.Mock).mockImplementation(() => ({
      myRole: { canViewSettings: true },
    }));
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).prop('to')).toEqual(
      'http://localhost:3002/as/settings/account'
    );
  });

  it('renders the Credentials link', () => {
    (useValues as jest.Mock).mockImplementation(() => ({
      myRole: { canViewAccountCredentials: true },
    }));
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).prop('to')).toEqual('http://localhost:3002/as/credentials');
  });

  it('renders the Role Mappings link', () => {
    (useValues as jest.Mock).mockImplementation(() => ({
      myRole: { canViewRoleMappings: true },
    }));
    const wrapper = shallow(<AppSearchNav />);

    expect(wrapper.find(SideNavLink).prop('to')).toEqual('http://localhost:3002/as#/role-mappings');
  });
});
