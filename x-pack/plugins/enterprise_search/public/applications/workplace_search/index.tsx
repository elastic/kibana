/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { getContext, resetContext } from 'kea';

resetContext({ createStore: true });

const store = getContext().store as Store;

import { KibanaContext, IKibanaContext } from '../index';

import { SETUP_GUIDE_PATH } from './routes';

import { SetupGuide } from './components/setup_guide';
import { Overview } from './components/overview';

export const WorkplaceSearch: React.FC = () => {
  const { enterpriseSearchUrl } = useContext(KibanaContext) as IKibanaContext;
  return (
    <Provider store={store}>
      <Route exact path="/">
        {!enterpriseSearchUrl ? <Redirect to={SETUP_GUIDE_PATH} /> : <Overview />}
      </Route>
      <Route path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
    </Provider>
  );
};
