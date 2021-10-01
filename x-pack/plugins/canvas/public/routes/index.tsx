/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Router, Switch } from 'react-router-dom';
import { History } from 'history';
import { HomeRoute } from './home';
import { WorkpadRoute, ExportWorkpadRoute } from './workpad';

export const CanvasRouter: FC<{ history: History }> = ({ history }) => (
  <Router history={history}>
    <Switch>
      {ExportWorkpadRoute()}
      {WorkpadRoute()}
      {HomeRoute()}
    </Switch>
  </Router>
);
