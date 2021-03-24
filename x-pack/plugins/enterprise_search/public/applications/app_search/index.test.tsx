/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import '../__mocks__/enterprise_search_url.mock';
import { setMockValues, rerender } from '../__mocks__';

import React from 'react';

import { Redirect } from 'react-router-dom';

import { shallow, ShallowWrapper } from 'enzyme';

import { Layout, SideNav, SideNavLink } from '../shared/layout';

jest.mock('./app_logic', () => ({ AppLogic: jest.fn() }));
import { AppLogic } from './app_logic';

import { EngineRouter } from './components/engine';
import { EngineCreation } from './components/engine_creation';
import { EnginesOverview } from './components/engines';
import { ErrorConnecting } from './components/error_connecting';
import { MetaEngineCreation } from './components/meta_engine_creation';
import { RoleMappingsRouter } from './components/role_mappings';
import { SetupGuide } from './components/setup_guide';

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
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    setMockValues({ myRole: {} });
    wrapper = shallow(<AppSearchConfigured {...DEFAULT_INITIAL_APP_DATA} />);
  });

  it('renders with layout', () => {
    expect(wrapper.find(Layout)).toHaveLength(2);
    expect(wrapper.find(Layout).last().prop('readOnlyMode')).toBeFalsy();
    expect(wrapper.find(EnginesOverview)).toHaveLength(1);
    expect(wrapper.find(EngineRouter)).toHaveLength(1);
  });

  it('mounts AppLogic with passed initial data props', () => {
    expect(AppLogic).toHaveBeenCalledWith(DEFAULT_INITIAL_APP_DATA);
  });

  it('renders ErrorConnecting', () => {
    setMockValues({ myRole: {}, errorConnecting: true });
    rerender(wrapper);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
  });

  it('passes readOnlyMode state', () => {
    setMockValues({ myRole: {}, readOnlyMode: true });
    rerender(wrapper);

    expect(wrapper.find(Layout).first().prop('readOnlyMode')).toEqual(true);
  });

  describe('ability checks', () => {
    describe('canViewRoleMappings', () => {
      it('renders RoleMappings when canViewRoleMappings is true', () => {
        setMockValues({ myRole: { canViewRoleMappings: true } });
        rerender(wrapper);
        expect(wrapper.find(RoleMappingsRouter)).toHaveLength(1);
      });

      it('does not render RoleMappings when user canViewRoleMappings is false', () => {
        setMockValues({ myRole: { canManageEngines: false } });
        rerender(wrapper);
        expect(wrapper.find(RoleMappingsRouter)).toHaveLength(0);
      });
    });

    describe('canManageEngines', () => {
      it('renders EngineCreation when user canManageEngines is true', () => {
        setMockValues({ myRole: { canManageEngines: true } });
        rerender(wrapper);

        expect(wrapper.find(EngineCreation)).toHaveLength(1);
      });

      it('does not render EngineCreation when user canManageEngines is false', () => {
        setMockValues({ myRole: { canManageEngines: false } });
        rerender(wrapper);

        expect(wrapper.find(EngineCreation)).toHaveLength(0);
      });
    });

    describe('canManageMetaEngines', () => {
      it('renders MetaEngineCreation when user canManageMetaEngines is true', () => {
        setMockValues({ myRole: { canManageMetaEngines: true } });
        rerender(wrapper);

        expect(wrapper.find(MetaEngineCreation)).toHaveLength(1);
      });

      it('does not render MetaEngineCreation when user canManageMetaEngines is false', () => {
        setMockValues({ myRole: { canManageMetaEngines: false } });
        rerender(wrapper);

        expect(wrapper.find(MetaEngineCreation)).toHaveLength(0);
      });
    });
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

    expect(wrapper.find(SideNavLink).last().prop('to')).toEqual('/role_mappings');
  });
});
