/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Switch, Route } from 'react-router-dom';
import { BASE_PATH } from '../../common/constants';
import { PipelinesList, PipelinesCreate, PipelinesEdit, PipelinesClone } from './sections';

export const App = () => {
  return (
    <HashRouter>
      <AppWithoutRouter />
    </HashRouter>
  );
};

export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path={BASE_PATH} component={PipelinesList} />
    <Route exact path={`${BASE_PATH}/create/:sourceName`} component={PipelinesClone} />
    <Route exact path={`${BASE_PATH}/create`} component={PipelinesCreate} />
    <Route exact path={`${BASE_PATH}/edit/:name`} component={PipelinesEdit} />
  </Switch>
);
