/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';

import { KibanaContext, IKibanaContext } from '../index';

import { SetupGuide } from './components/setup_guide';
import { EngineOverview } from './components/engine_overview';

export const AppSearch: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;

  return (
    <>
      <Route exact path="/">
        {!enterpriseSearchUrl ? <Redirect to="/setup_guide" /> : <EngineOverview />}
      </Route>
      <Route path="/setup_guide">
        <SetupGuide />
      </Route>
    </>
  );
};
