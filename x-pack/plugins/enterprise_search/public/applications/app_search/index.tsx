/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Redirect } from 'react-router-dom';

import { SetupGuide } from './components/setup_guide';
import { EngineOverview } from './components/engine_overview';

interface IAppSearchProps {
  appSearchUrl?: string;
}

export const AppSearch: React.FC<IAppSearchProps> = props => (
  <>
    <Route exact path="/app_search">
      {!props.appSearchUrl ? (
        <Redirect to="/app_search/setup_guide" />
      ) : (
        <EngineOverview {...props} />
      )}
    </Route>
    <Route path="/app_search/setup_guide">
      <SetupGuide {...props} />
    </Route>
  </>
);
