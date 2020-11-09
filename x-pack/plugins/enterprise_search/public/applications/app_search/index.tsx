/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { useActions, useValues } from 'kea';

import { getAppSearchUrl } from '../shared/enterprise_search_url';
import { KibanaLogic } from '../shared/kibana';
import { HttpLogic } from '../shared/http';
import { AppLogic } from './app_logic';
import { IInitialAppData } from '../../../common/types';

import { APP_SEARCH_PLUGIN } from '../../../common/constants';
import { Layout, SideNav, SideNavLink } from '../shared/layout';
import { EngineNav, EngineRouter } from './components/engine';

import {
  ROOT_PATH,
  SETUP_GUIDE_PATH,
  SETTINGS_PATH,
  CREDENTIALS_PATH,
  ROLE_MAPPINGS_PATH,
  ENGINES_PATH,
  ENGINE_PATH,
} from './routes';

import { SetupGuide } from './components/setup_guide';
import { ErrorConnecting } from './components/error_connecting';
import { NotFound } from '../shared/not_found';
import { EnginesOverview, ENGINES_TITLE } from './components/engines';
import { Settings, SETTINGS_TITLE } from './components/settings';
import { Credentials, CREDENTIALS_TITLE } from './components/credentials';
import { ROLE_MAPPINGS_TITLE } from './components/role_mappings';

export const AppSearch: React.FC<IInitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  return !config.host ? <AppSearchUnconfigured /> : <AppSearchConfigured {...props} />;
};

export const AppSearchUnconfigured: React.FC = () => (
  <Switch>
    <Route exact path={SETUP_GUIDE_PATH}>
      <SetupGuide />
    </Route>
    <Route>
      <Redirect to={SETUP_GUIDE_PATH} />
    </Route>
  </Switch>
);

export const AppSearchConfigured: React.FC<IInitialAppData> = (props) => {
  const { initializeAppData } = useActions(AppLogic);
  const { hasInitialized } = useValues(AppLogic);
  const { errorConnecting, readOnlyMode } = useValues(HttpLogic);

  useEffect(() => {
    if (!hasInitialized) initializeAppData(props);
  }, [hasInitialized]);

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route path={ENGINE_PATH}>
        <Layout navigation={<AppSearchNav subNav={<EngineNav />} />} readOnlyMode={readOnlyMode}>
          <EngineRouter />
        </Layout>
      </Route>
      <Route>
        <Layout navigation={<AppSearchNav />} readOnlyMode={readOnlyMode}>
          {errorConnecting ? (
            <ErrorConnecting />
          ) : (
            <Switch>
              <Route exact path={ROOT_PATH}>
                <Redirect to={ENGINES_PATH} />
              </Route>
              <Route exact path={ENGINES_PATH}>
                <EnginesOverview />
              </Route>
              <Route exact path={SETTINGS_PATH}>
                <Settings />
              </Route>
              <Route exact path={CREDENTIALS_PATH}>
                <Credentials />
              </Route>
              <Route>
                <NotFound product={APP_SEARCH_PLUGIN} />
              </Route>
            </Switch>
          )}
        </Layout>
      </Route>
    </Switch>
  );
};

interface IAppSearchNavProps {
  subNav?: React.ReactNode;
}

export const AppSearchNav: React.FC<IAppSearchNavProps> = ({ subNav }) => {
  const {
    myRole: { canViewSettings, canViewAccountCredentials, canViewRoleMappings },
  } = useValues(AppLogic);

  return (
    <SideNav product={APP_SEARCH_PLUGIN}>
      <SideNavLink to={ENGINES_PATH} subNav={subNav} isRoot>
        {ENGINES_TITLE}
      </SideNavLink>
      {canViewSettings && <SideNavLink to={SETTINGS_PATH}>{SETTINGS_TITLE}</SideNavLink>}
      {canViewAccountCredentials && (
        <SideNavLink to={CREDENTIALS_PATH}>{CREDENTIALS_TITLE}</SideNavLink>
      )}
      {canViewRoleMappings && (
        <SideNavLink isExternal to={getAppSearchUrl(ROLE_MAPPINGS_PATH)}>
          {ROLE_MAPPINGS_TITLE}
        </SideNavLink>
      )}
    </SideNav>
  );
};
