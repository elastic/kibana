/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Route } from 'react-router-dom';

import { MainPages } from './pages/main';

export const PageRouter: React.SFC<{}> = () => {
  return (
    <HashRouter basename="/management/beats_management">
      <Route component={MainPages} />
    </HashRouter>
  );
};
