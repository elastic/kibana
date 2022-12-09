/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Navigate, Routes, useMatch } from 'react-router-dom';

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
  const isSetupGuidePath = !!useMatch(SETUP_GUIDE_PATH);

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
  const isOrganization = !useMatch(PERSONAL_PATH);

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
    <Routes>
      <Route path={SETUP_GUIDE_PATH} element={<SetupGuide />} />
      <Route path={SOURCE_ADDED_PATH} element={<SourceAdded />} />
      <Route path="/" element={<Overview />} />
      <Route path={PERSONAL_PATH}>
        <Routes>
          <Route path={PERSONAL_PATH} element={<Navigate to={PRIVATE_SOURCES_PATH} />} />
          <Route path={PRIVATE_SOURCES_PATH} element={<SourcesRouter />} />
          <Route path={PERSONAL_SETTINGS_PATH} element={<AccountSettings />} />
          <Route path={OAUTH_AUTHORIZE_PATH} element={<OAuthAuthorize />} />
          <Route path={SEARCH_AUTHORIZE_PATH} element={<SearchAuthorize />} />
          <Route element={<NotFound isOrganization={false} />} />
        </Routes>
      </Route>
      <Route path={SOURCES_PATH} element={<SourcesRouter />} />
      <Route path={GROUPS_PATH} element={<GroupsRouter />} />
      <Route path={USERS_AND_ROLES_PATH} element={<RoleMappings />} />
      <Route path={API_KEYS_PATH} element={<ApiKeys />} />
      <Route path={SECURITY_PATH} element={<Security />} />
      <Route path={ORG_SETTINGS_PATH} element={<SettingsRouter />} />
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};

export const WorkplaceSearchUnconfigured: React.FC = () => (
  <Routes>
    <Route path={SETUP_GUIDE_PATH} element={<SetupGuide />} />
    <Route element={<Navigate to={SETUP_GUIDE_PATH} />} />
  </Routes>
);
