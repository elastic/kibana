/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { useValues } from 'kea';

import { IInitialAppData } from '../../../common/types';
import { KibanaContext, IKibanaContext } from '../index';
import { HttpLogic, IHttpLogicValues } from '../shared/http';
import { Layout } from '../shared/layout';
import { WorkplaceSearchNav } from './components/layout/nav';

import { SETUP_GUIDE_PATH } from './routes';

import { SetupGuide } from './views/setup_guide';
import { ErrorState } from './views/error_state';
import { Overview } from './views/overview';

export const WorkplaceSearch: React.FC<IInitialAppData> = () => {
  const { config } = useContext(KibanaContext) as IKibanaContext;
  const { errorConnecting } = useValues(HttpLogic) as IHttpLogicValues;

  if (!config.host)
    return (
      <Switch>
        <Route exact path={SETUP_GUIDE_PATH}>
          <SetupGuide />
        </Route>
        <Route>
          <Redirect to={SETUP_GUIDE_PATH} />
        </Route>
      </Switch>
    );

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
