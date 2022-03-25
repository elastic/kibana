/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Redirect, Switch, useRouteMatch } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { AppLogic } from './app_logic';
import { WorkplaceSearchHeaderActions } from './components/layout';
import {
  GROUPS_PATH,
  SETUP_GUIDE_PATH,
  SEARCH_AUTHORIZE_PATH,
  SOURCES_PATH,
  SOURCE_ADDED_PATH,
  OAUTH_AUTHORIZE_PATH,
  PRIVATE_SOURCES_PATH,
  ORG_SETTINGS_PATH,
  USERS_AND_ROLES_PATH,
  API_KEYS_PATH,
  SECURITY_PATH,
  PERSONAL_SETTINGS_PATH,
  PERSONAL_PATH,
} from './routes';
import { AccountSettings } from './views/account_settings';
import { ApiKeys } from './views/api_keys';
import { SourcesRouter } from './views/content_sources';
import { SourceAdded } from './views/content_sources/components/source_added';
import { ErrorState } from './views/error_state';
import { GroupsRouter } from './views/groups';
import { NotFound } from './views/not_found';
import { OAuthAuthorize } from './views/oauth_authorize';
import { Overview } from './views/overview';
import { RoleMappings } from './views/role_mappings';
import { SearchAuthorize } from './views/search_authorize';
import { Security } from './views/security';
import { SettingsRouter } from './views/settings';
import { SetupGuide } from './views/setup_guide';

export const WorkplaceSearch: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);
  const isSetupGuidePath = !!useRouteMatch(SETUP_GUIDE_PATH);

  if (!config.host) {
    return <WorkplaceSearchUnconfigured />;
  } else if (incompatibleVersions) {
    return (
      <VersionMismatchPage
        enterpriseSearchVersion={enterpriseSearchVersion}
        kibanaVersion={kibanaVersion}
      />
    );
  } else if (errorConnectingMessage && !isSetupGuidePath) {
    return <ErrorState />;
  }

  return <WorkplaceSearchConfigured {...props} />;
};

export const WorkplaceSearchConfigured: React.FC<InitialAppData> = (props) => {
  const { hasInitialized } = useValues(AppLogic);
  const { initializeAppData, setContext } = useActions(AppLogic);
  const { renderHeaderActions, setChromeIsVisible } = useValues(KibanaLogic);

  /**
   * Personal dashboard urls begin with /p/
   * EX: http://localhost:5601/app/enterprise_search/workplace_search/p/sources
   */
  const isOrganization = !useRouteMatch(PERSONAL_PATH);

  setContext(isOrganization);

  useEffect(() => {
    setChromeIsVisible(isOrganization);
  }, [isOrganization]);

  useEffect(() => {
    if (!hasInitialized) {
      initializeAppData(props);
      renderHeaderActions(WorkplaceSearchHeaderActions);
    }
  }, [hasInitialized]);

  return (
    <Switch>
      <Route path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route path={SOURCE_ADDED_PATH}>
        <SourceAdded />
      </Route>
      <Route exact path="/">
        <Overview />
      </Route>
      <Route path={PERSONAL_PATH}>
        <Switch>
          <Redirect exact from={PERSONAL_PATH} to={PRIVATE_SOURCES_PATH} />
          <Route path={PRIVATE_SOURCES_PATH}>
            <SourcesRouter />
          </Route>
          <Route path={PERSONAL_SETTINGS_PATH}>
            <AccountSettings />
          </Route>
          <Route path={OAUTH_AUTHORIZE_PATH}>
            <OAuthAuthorize />
          </Route>
          <Route path={SEARCH_AUTHORIZE_PATH}>
            <SearchAuthorize />
          </Route>
          <Route>
            <NotFound isOrganization={false} />
          </Route>
        </Switch>
      </Route>
      <Route path={SOURCES_PATH}>
        <SourcesRouter />
      </Route>
      <Route path={GROUPS_PATH}>
        <GroupsRouter />
      </Route>
      <Route path={USERS_AND_ROLES_PATH}>
        <RoleMappings />
      </Route>
      <Route path={API_KEYS_PATH}>
        <ApiKeys />
      </Route>
      <Route path={SECURITY_PATH}>
        <Security />
      </Route>
      <Route path={ORG_SETTINGS_PATH}>
        <SettingsRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};

export const WorkplaceSearchUnconfigured: React.FC = () => (
  <Switch>
    <Route exact path={SETUP_GUIDE_PATH}>
      <SetupGuide />
    </Route>
    <Route>
      <Redirect to={SETUP_GUIDE_PATH} />
    </Route>
  </Switch>
);
