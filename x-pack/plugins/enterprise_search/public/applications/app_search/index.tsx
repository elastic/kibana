/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Redirect, Switch, useRouteMatch } from 'react-router-dom';

import { useValues } from 'kea';

import { APP_SEARCH_PLUGIN } from '../../../common/constants';
import { InitialAppData } from '../../../common/types';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { Layout, SideNav, SideNavLink } from '../shared/layout';
import { NotFound } from '../shared/not_found';

import { ROLE_MAPPINGS_TITLE } from '../shared/role_mapping/constants';

import { AppLogic } from './app_logic';
import { Credentials, CREDENTIALS_TITLE } from './components/credentials';
import { EngineNav, EngineRouter } from './components/engine';
import { EngineCreation } from './components/engine_creation';
import { EnginesOverview, ENGINES_TITLE } from './components/engines';
import { ErrorConnecting } from './components/error_connecting';
import { Library } from './components/library';
import { MetaEngineCreation } from './components/meta_engine_creation';
import { RoleMappingsRouter } from './components/role_mappings';
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
  META_ENGINE_CREATION_PATH,
} from './routes';

export const AppSearch: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  const { errorConnecting } = useValues(HttpLogic);

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route>
        {!config.host ? (
          <AppSearchUnconfigured />
        ) : errorConnecting ? (
          <ErrorConnecting />
        ) : (
          <AppSearchConfigured {...(props as Required<InitialAppData>)} />
        )}
      </Route>
    </Switch>
  );
};

export const AppSearchUnconfigured: React.FC = () => (
  <Switch>
    <Route>
      <Redirect to={SETUP_GUIDE_PATH} />
    </Route>
  </Switch>
);

export const AppSearchConfigured: React.FC<Required<InitialAppData>> = (props) => {
  const {
    myRole: { canManageEngines, canManageMetaEngines, canViewRoleMappings },
  } = useValues(AppLogic(props));
  const { readOnlyMode } = useValues(HttpLogic);

  return (
    <Switch>
      {process.env.NODE_ENV === 'development' && (
        <Route path={LIBRARY_PATH}>
          <Library />
        </Route>
      )}
      <Route>
        <Layout navigation={<AppSearchNav />} readOnlyMode={readOnlyMode}>
          <Switch>
            <Route exact path={ROOT_PATH}>
              <Redirect to={ENGINES_PATH} />
            </Route>
            <Route exact path={ENGINES_PATH}>
              <EnginesOverview />
            </Route>
            <Route path={ENGINE_PATH}>
              <EngineRouter />
            </Route>
            <Route exact path={SETTINGS_PATH}>
              <Settings />
            </Route>
            <Route exact path={CREDENTIALS_PATH}>
              <Credentials />
            </Route>
            {canViewRoleMappings && (
              <Route path={ROLE_MAPPINGS_PATH}>
                <RoleMappingsRouter />
              </Route>
            )}
            {canManageEngines && (
              <Route exact path={ENGINE_CREATION_PATH}>
                <EngineCreation />
              </Route>
            )}
            {canManageMetaEngines && (
              <Route exact path={META_ENGINE_CREATION_PATH}>
                <MetaEngineCreation />
              </Route>
            )}
            <Route>
              <NotFound product={APP_SEARCH_PLUGIN} />
            </Route>
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
};

export const AppSearchNav: React.FC = () => {
  const {
    myRole: { canViewSettings, canViewAccountCredentials, canViewRoleMappings },
  } = useValues(AppLogic);

  const isEngineRoute = !!useRouteMatch(ENGINE_PATH);

  return (
    <SideNav product={APP_SEARCH_PLUGIN}>
      <SideNavLink to={ENGINES_PATH} subNav={isEngineRoute ? <EngineNav /> : null} isRoot>
        {ENGINES_TITLE}
      </SideNavLink>
      {canViewSettings && <SideNavLink to={SETTINGS_PATH}>{SETTINGS_TITLE}</SideNavLink>}
      {canViewAccountCredentials && (
        <SideNavLink to={CREDENTIALS_PATH}>{CREDENTIALS_TITLE}</SideNavLink>
      )}
      {canViewRoleMappings && (
        <SideNavLink shouldShowActiveForSubroutes to={ROLE_MAPPINGS_PATH}>
          {ROLE_MAPPINGS_TITLE}
        </SideNavLink>
      )}
    </SideNav>
  );
};
