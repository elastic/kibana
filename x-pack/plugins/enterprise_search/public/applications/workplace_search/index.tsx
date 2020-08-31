/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { useActions, useValues } from 'kea';

import { IInitialAppData } from '../../../common/types';
import { KibanaContext, IKibanaContext } from '../index';
import { HttpLogic } from '../shared/http';
import { AppLogic } from './app_logic';
import { Layout } from '../shared/layout';
import { WorkplaceSearchNav } from './components/layout/nav';

import { SETUP_GUIDE_PATH } from './routes';

import { SetupGuide } from './views/setup_guide';
import { ErrorState } from './views/error_state';
import { Overview } from './views/overview';

export const WorkplaceSearch: React.FC<IInitialAppData> = (props) => {
  const { config } = useContext(KibanaContext) as IKibanaContext;
  return !config.host ? <WorkplaceSearchUnconfigured /> : <WorkplaceSearchConfigured {...props} />;
};

export const WorkplaceSearchConfigured: React.FC<IInitialAppData> = (props) => {
  const { hasInitialized } = useValues(AppLogic);
  const { initializeAppData } = useActions(AppLogic);
  const { errorConnecting } = useValues(HttpLogic);

  useEffect(() => {
    if (!hasInitialized) initializeAppData(props);
  }, [hasInitialized]);

  return (
    <Switch>
      <Route path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route exact path="/">
        {errorConnecting ? <ErrorState /> : <Overview />}
      </Route>
      <Route>
        <Layout navigation={<WorkplaceSearchNav />}>
          {errorConnecting ? (
            <ErrorState />
          ) : (
            <Switch>
              <Route exact path="/groups">
                {/* Will replace with groups component subsequent PR */}
                <div />
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
