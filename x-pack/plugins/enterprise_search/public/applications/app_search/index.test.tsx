/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { setMockValues } from '../__mocks__/kea_logic';
import '../__mocks__/shallow_useeffect.mock';
import '../__mocks__/enterprise_search_url.mock';

import React from 'react';

import { Redirect } from 'react-router-dom';

import { shallow, ShallowWrapper } from 'enzyme';

import { VersionMismatchPage } from '../shared/version_mismatch';
import { rerender } from '../test_helpers';

jest.mock('./app_logic', () => ({ AppLogic: jest.fn() }));
import { AppLogic } from './app_logic';

import { Credentials } from './components/credentials';
import { EngineRouter } from './components/engine';
import { EngineCreation } from './components/engine_creation';
import { EnginesOverview } from './components/engines';
import { ErrorConnecting } from './components/error_connecting';
import { Library } from './components/library';
import { MetaEngineCreation } from './components/meta_engine_creation';
import { RoleMappings } from './components/role_mappings';
import { Settings } from './components/settings';
import { SetupGuide } from './components/setup_guide';

import { AppSearch, AppSearchUnconfigured, AppSearchConfigured } from '.';

describe('AppSearch', () => {
  it('always renders the Setup Guide', () => {
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
  });

  it('renders VersionMismatchPage when there are mismatching versions', () => {
    const wrapper = shallow(<AppSearch enterpriseSearchVersion="7.15.0" kibanaVersion="7.16.0" />);

    expect(wrapper.find(VersionMismatchPage)).toHaveLength(1);
  });

  it('renders AppSearchUnconfigured when config.host is not set', () => {
    setMockValues({ config: { host: '' } });
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(AppSearchUnconfigured)).toHaveLength(1);
  });

  it('renders ErrorConnecting when Enterprise Search is unavailable', () => {
    setMockValues({ errorConnectingMessage: '502 Bad Gateway' });
    const wrapper = shallow(<AppSearch />);

    const errorConnection = wrapper.find(ErrorConnecting);
    expect(errorConnection).toHaveLength(1);
  });

  it('renders AppSearchConfigured when config.host is set & available', () => {
    setMockValues({ errorConnectingMessage: '', config: { host: 'some.url' } });
    const wrapper = shallow(<AppSearch />);

    expect(wrapper.find(AppSearchConfigured)).toHaveLength(1);
  });
});

describe('AppSearchUnconfigured', () => {
  it('redirects to the Setup Guide', () => {
    const wrapper = shallow(<AppSearchUnconfigured />);

    expect(wrapper.find(Redirect)).toHaveLength(1);
  });
});

describe('AppSearchConfigured', () => {
  let wrapper: ShallowWrapper;
  const renderHeaderActions = jest.fn();

  beforeAll(() => {
    setMockValues({ myRole: {}, renderHeaderActions });
    wrapper = shallow(<AppSearchConfigured {...DEFAULT_INITIAL_APP_DATA} />);
  });

  it('renders header actions', () => {
    expect(renderHeaderActions).toHaveBeenCalled();
  });

  it('mounts AppLogic with passed initial data props', () => {
    expect(AppLogic).toHaveBeenCalledWith(DEFAULT_INITIAL_APP_DATA);
  });

  it('renders engine routes', () => {
    expect(wrapper.find(EnginesOverview)).toHaveLength(1);
    expect(wrapper.find(EngineRouter)).toHaveLength(1);
  });

  describe('routes with ability checks', () => {
    const runRouteAbilityCheck = (routeAbility: string, View: React.FC) => {
      describe(View.name, () => {
        it(`renders ${View.name} when user ${routeAbility} is true`, () => {
          setMockValues({ myRole: { [routeAbility]: true } });
          rerender(wrapper);
          expect(wrapper.find(View)).toHaveLength(1);
        });

        it(`does not render ${View.name} when user ${routeAbility} is false`, () => {
          setMockValues({ myRole: { [routeAbility]: false } });
          rerender(wrapper);
          expect(wrapper.find(View)).toHaveLength(0);
        });
      });
    };

    runRouteAbilityCheck('canViewSettings', Settings);
    runRouteAbilityCheck('canViewAccountCredentials', Credentials);
    runRouteAbilityCheck('canViewRoleMappings', RoleMappings);
    runRouteAbilityCheck('canManageEngines', EngineCreation);
    runRouteAbilityCheck('canManageMetaEngines', MetaEngineCreation);
  });

  describe('library', () => {
    it('renders a library page in development', () => {
      const OLD_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      rerender(wrapper);

      expect(wrapper.find(Library)).toHaveLength(1);
      process.env.NODE_ENV = OLD_ENV;
    });

    it("doesn't in production", () => {
      const OLD_ENV = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      rerender(wrapper);

      expect(wrapper.find(Library)).toHaveLength(0);
      process.env.NODE_ENV = OLD_ENV;
    });
  });
});
