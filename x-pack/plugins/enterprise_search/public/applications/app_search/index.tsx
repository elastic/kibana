/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN } from '../../../common/constants';
import { KibanaContext, IKibanaContext } from '../index';
import { Layout, SideNav, SideNavLink } from '../shared/layout';

import { SetupGuide } from './components/setup_guide';
import { EngineOverview } from './components/engine_overview';

export const AppSearch: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;
  if (!enterpriseSearchUrl)
    return (
      <Switch>
        <Route exact path="/setup_guide">
          <SetupGuide />
        </Route>
        <Route>
          <Redirect to="/setup_guide" />
          <SetupGuide /> {/* Kibana displays a blank page on redirect if this isn't included */}
        </Route>
      </Switch>
    );

  return (
    <Switch>
      <Route exact path="/setup_guide">
        <SetupGuide />
      </Route>
      <Route>
        <Layout navigation={<AppSearchNav />}>
          <Switch>
            <Route exact path="/">
              {/* For some reason a Redirect to /engines just doesn't work here - it shows a blank page */}
              <EngineOverview />
            </Route>
            <Route exact path="/engines">
              <EngineOverview />
            </Route>
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
};

export const AppSearchNav: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;
  const externalUrl = `${enterpriseSearchUrl}/as#`;

  return (
    <SideNav product={APP_SEARCH_PLUGIN}>
      <SideNavLink to="/engines" isRoot>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.engines', {
          defaultMessage: 'Engines',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={`${externalUrl}/settings/account`}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.settings', {
          defaultMessage: 'Account Settings',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={`${externalUrl}/credentials`}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.credentials', {
          defaultMessage: 'Credentials',
        })}
      </SideNavLink>
      <SideNavLink isExternal to={`${externalUrl}/role-mappings`}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.nav.roleMappings', {
          defaultMessage: 'Role Mappings',
        })}
      </SideNavLink>
    </SideNav>
  );
};
