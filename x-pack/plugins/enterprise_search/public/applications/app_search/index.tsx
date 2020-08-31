/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { KibanaContext, IKibanaContext } from '../index';
import { HttpLogic } from '../shared/http';
import { AppLogic } from './app_logic';
import { IInitialAppData } from '../../../common/types';

import { APP_SEARCH_PLUGIN } from '../../../common/constants';
import { Layout, SideNav, SideNavLink } from '../shared/layout';

import {
  ROOT_PATH,
  SETUP_GUIDE_PATH,
  SETTINGS_PATH,
  CREDENTIALS_PATH,
  ROLE_MAPPINGS_PATH,
  ENGINES_PATH,
} from './routes';

import { SetupGuide } from './components/setup_guide';
import { ErrorConnecting } from './components/error_connecting';
import { EngineOverview } from './components/engine_overview';

export const AppSearch: React.FC<IInitialAppData> = (props) => {
  const { config } = useContext(KibanaContext) as IKibanaContext;
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
  const { hasInitialized } = useValues(AppLogic);
  const { initializeAppData } = useActions(AppLogic);
  const { errorConnecting } = useValues(HttpLogic);

  useEffect(() => {
    if (!hasInitialized) initializeAppData(props);
  }, [hasInitialized]);

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route>
        <Layout navigation={<AppSearchNav />}>
          {errorConnecting ? (
            <ErrorConnecting />
          ) : (
            <Switch>
              <Route exact path={ROOT_PATH}>
                <Redirect to={ENGINES_PATH} />
              </Route>
              <Route exact path={ENGINES_PATH}>
                <EngineOverview />
              </Route>
            </Switch>
          )}
        </Layout>
      </Route>
    </Switch>
  );
};

export const AppSearchNav: React.FC = () => {
  const {
    externalUrl: { getAppSearchUrl },
  } = useContext(KibanaContext) as IKibanaContext;

  return (
    <SideNav product={APP_SEARCH_PLUGIN}>
      <SideNavLink to={ENGINES_PATH} isRoot>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.engines', {
          defaultMessage: 'Engines',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getAppSearchUrl(SETTINGS_PATH)}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.settings', {
          defaultMessage: 'Account Settings',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getAppSearchUrl(CREDENTIALS_PATH)}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.credentials', {
          defaultMessage: 'Credentials',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={getAppSearchUrl(ROLE_MAPPINGS_PATH)}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.roleMappings', {
          defaultMessage: 'Role Mappings',
        })}
      </SideNavLink>
    </SideNav>
  );
};
