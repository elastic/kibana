/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';

import { IInitialAppData } from '../../../common/types';
import { KibanaContext, IKibanaContext } from '../index';
import { Layout } from '../shared/layout';
import { WorkplaceSearchNav } from './components/layout/nav';

import { SETUP_GUIDE_PATH } from './routes';

import { SetupGuide } from './components/setup_guide';
import { Overview } from './components/overview';

export const WorkplaceSearch: React.FC<IInitialAppData> = (props) => {
  const { config } = useContext(KibanaContext) as IKibanaContext;
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
        <Overview />
      </Route>
      <Route>
        <Layout navigation={<WorkplaceSearchNav />}>
          <Switch>
            <Route exact path="/groups">
              {/* Will replace with groups component subsequent PR */}
              <div />
            </Route>
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
};
