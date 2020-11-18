/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, Redirect, Switch, useLocation } from 'react-router-dom';
import { useActions, useValues } from 'kea';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../common/constants';
import { InitialAppData } from '../../../common/types';
import { KibanaLogic } from '../shared/kibana';
import { HttpLogic } from '../shared/http';
import { AppLogic } from './app_logic';
import { Layout } from '../shared/layout';
import { WorkplaceSearchNav, WorkplaceSearchHeaderActions } from './components/layout';

import { GROUPS_PATH, SETUP_GUIDE_PATH } from './routes';

import { SetupGuide } from './views/setup_guide';
import { ErrorState } from './views/error_state';
import { NotFound } from '../shared/not_found';
import { Overview } from './views/overview';
import { GroupsRouter } from './views/groups';

export const WorkplaceSearch: React.FC<InitialAppData> = (props) => {
  const { config } = useValues(KibanaLogic);
  return !config.host ? <WorkplaceSearchUnconfigured /> : <WorkplaceSearchConfigured {...props} />;
};

export const WorkplaceSearchConfigured: React.FC<InitialAppData> = (props) => {
  const { hasInitialized } = useValues(AppLogic);
  const { initializeAppData, setContext } = useActions(AppLogic);
  const { renderHeaderActions } = useValues(KibanaLogic);
  const { errorConnecting, readOnlyMode } = useValues(HttpLogic);

  const { pathname } = useLocation();

  /**
   * Personal dashboard urls begin with /p/
   * EX: http://localhost:5601/app/enterprise_search/workplace_search/p/sources
   */
  const personalSourceUrlRegex = /^\/p\//g; // matches '/p/*'

  // TODO: Once auth is figured out, we need to have a check for the equivilent of `isAdmin`.
  const isOrganization = !pathname.match(personalSourceUrlRegex);

  useEffect(() => {
    if (!hasInitialized) {
      initializeAppData(props);
      renderHeaderActions(WorkplaceSearchHeaderActions);
    }
  }, [hasInitialized]);

  useEffect(() => {
    setContext(isOrganization);
  }, [isOrganization]);

  return (
    <Switch>
      <Route path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route exact path="/">
        {errorConnecting ? <ErrorState /> : <Overview />}
      </Route>
      <Route>
        <Layout navigation={<WorkplaceSearchNav />} restrictWidth readOnlyMode={readOnlyMode}>
          {errorConnecting ? (
            <ErrorState />
          ) : (
            <Switch>
              <Route path={GROUPS_PATH}>
                <GroupsRouter />
              </Route>
              <Route>
                <NotFound product={WORKPLACE_SEARCH_PLUGIN} />
              </Route>
            </Switch>
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
