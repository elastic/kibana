/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Redirect, Switch, useLocation } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../common/constants';
import { InitialAppData } from '../../../common/types';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { Layout } from '../shared/layout';
import { NotFound } from '../shared/not_found';

import { AppLogic } from './app_logic';
import { WorkplaceSearchNav, WorkplaceSearchHeaderActions } from './components/layout';
import {
  GROUPS_PATH,
  SETUP_GUIDE_PATH,
  SOURCES_PATH,
  SOURCE_ADDED_PATH,
  PERSONAL_SOURCES_PATH,
  ORG_SETTINGS_PATH,
  ROLE_MAPPINGS_PATH,
  SECURITY_PATH,
} from './routes';
import { SourcesRouter } from './views/content_sources';
import { SourceAdded } from './views/content_sources/components/source_added';
import { SourceSubNav } from './views/content_sources/components/source_sub_nav';
import { PrivateSourcesLayout } from './views/content_sources/private_sources_layout';
import { ErrorState } from './views/error_state';
import { GroupsRouter } from './views/groups';
import { GroupSubNav } from './views/groups/components/group_sub_nav';
import { Overview } from './views/overview';
import { RoleMappingsRouter } from './views/role_mappings';
import { Security } from './views/security';
import { SettingsRouter } from './views/settings';
import { SettingsSubNav } from './views/settings/components/settings_sub_nav';
import { SetupGuide } from './views/setup_guide';

export const WorkplaceSearch: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  return !config.host ? <WorkplaceSearchUnconfigured /> : <WorkplaceSearchConfigured {...props} />;
};

export const WorkplaceSearchConfigured: React.FC<InitialAppData> = (props) => {
  const { hasInitialized } = useValues(AppLogic);
  const { initializeAppData, setContext } = useActions(AppLogic);
  const { renderHeaderActions, setChromeIsVisible } = useValues(KibanaLogic);
  const { errorConnecting, readOnlyMode } = useValues(HttpLogic);

  const { pathname } = useLocation();

  // We don't want so show the subnavs on the container root pages.
  const showSourcesSubnav = pathname !== SOURCES_PATH && pathname !== PERSONAL_SOURCES_PATH;
  const showGroupsSubnav = pathname !== GROUPS_PATH;

  /**
   * Personal dashboard urls begin with /p/
   * EX: http://localhost:5601/app/enterprise_search/workplace_search/p/sources
   */

  const personalSourceUrlRegex = /^\/p\//g; // matches '/p/*'
  const isOrganization = !pathname.match(personalSourceUrlRegex); // TODO: Once auth is figured out, we need to have a check for the equivilent of `isAdmin`.

  setContext(isOrganization);

  useEffect(() => {
    setChromeIsVisible(isOrganization);
  }, [pathname]);

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
        {errorConnecting ? (
          <ErrorState />
        ) : (
          <Layout navigation={<WorkplaceSearchNav />} restrictWidth readOnlyMode={readOnlyMode}>
            <Overview />
          </Layout>
        )}
      </Route>
      <Route path={PERSONAL_SOURCES_PATH}>
        <PrivateSourcesLayout restrictWidth readOnlyMode={readOnlyMode}>
          <SourcesRouter />
        </PrivateSourcesLayout>
      </Route>
      <Route path={SOURCES_PATH}>
        <Layout
          navigation={<WorkplaceSearchNav sourcesSubNav={showSourcesSubnav && <SourceSubNav />} />}
          restrictWidth
          readOnlyMode={readOnlyMode}
        >
          <SourcesRouter />
        </Layout>
      </Route>
      <Route path={GROUPS_PATH}>
        <Layout
          navigation={<WorkplaceSearchNav groupsSubNav={showGroupsSubnav && <GroupSubNav />} />}
          restrictWidth
          readOnlyMode={readOnlyMode}
        >
          <GroupsRouter />
        </Layout>
      </Route>
      <Route path={ROLE_MAPPINGS_PATH}>
        <Layout navigation={<WorkplaceSearchNav />} restrictWidth readOnlyMode={readOnlyMode}>
          <RoleMappingsRouter />
        </Layout>
      </Route>
      <Route path={SECURITY_PATH}>
        <Layout navigation={<WorkplaceSearchNav />} restrictWidth readOnlyMode={readOnlyMode}>
          <Security />
        </Layout>
      </Route>
      <Route path={ORG_SETTINGS_PATH}>
        <Layout
          navigation={<WorkplaceSearchNav settingsSubNav={<SettingsSubNav />} />}
          restrictWidth
          readOnlyMode={readOnlyMode}
        >
          <SettingsRouter />
        </Layout>
      </Route>
      <Route>
        <Layout navigation={<WorkplaceSearchNav />} restrictWidth readOnlyMode={readOnlyMode}>
          {errorConnecting ? (
            <ErrorState />
          ) : (
            <Route>
              <NotFound product={WORKPLACE_SEARCH_PLUGIN} />
            </Route>
          )}
        </Layout>
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
