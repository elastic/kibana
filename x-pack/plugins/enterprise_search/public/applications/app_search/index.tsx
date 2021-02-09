/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { APP_SEARCH_PLUGIN } from '../../../common/constants';
import { InitialAppData } from '../../../common/types';
import { getAppSearchUrl } from '../shared/enterprise_search_url';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { Layout, SideNav, SideNavLink } from '../shared/layout';
import { NotFound } from '../shared/not_found';

import { AppLogic } from './app_logic';
import { Credentials, CREDENTIALS_TITLE } from './components/credentials';
import { EngineNav, EngineRouter } from './components/engine';
import { EngineCreation } from './components/engine_creation';
import { EnginesOverview, ENGINES_TITLE } from './components/engines';
import { ErrorConnecting } from './components/error_connecting';
import { Library } from './components/library';
import { ROLE_MAPPINGS_TITLE } from './components/role_mappings';
import { Settings, SETTINGS_TITLE } from './components/settings';
import { SetupGuide } from './components/setup_guide';
import {
  ENGINE_CREATION_PATH,
  ROOT_PATH,
  SETUP_GUIDE_PATH,
  SETTINGS_PATH,
  CREDENTIALS_PATH,
  ROLE_MAPPINGS_PATH,
  ENGINES_PATH,
  ENGINE_PATH,
  LIBRARY_PATH,
} from './routes';

export const AppSearch: React.FC<InitialAppData> = (props) => {
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

export const AppSearchConfigured: React.FC<InitialAppData> = (props) => {
  const { initializeAppData } = useActions(AppLogic);
  const {
    hasInitialized,
    myRole: { canManageEngines },
  } = useValues(AppLogic);
  const { errorConnecting, readOnlyMode } = useValues(HttpLogic);

  useEffect(() => {
    if (!hasInitialized) initializeAppData(props);
  }, [hasInitialized]);

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      {process.env.NODE_ENV === 'development' && (
        <Route path={LIBRARY_PATH}>
          <Library />
        </Route>
      )}
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
              {canManageEngines && (
                <Route exact path={ENGINE_CREATION_PATH}>
                  <EngineCreation />
                </Route>
              )}
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

interface AppSearchNavProps {
  subNav?: React.ReactNode;
}

export const AppSearchNav: React.FC<AppSearchNavProps> = ({ subNav }) => {
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
