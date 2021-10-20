/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import TestPage from '../components/TestPage';

const Routes = () => {
  /**
   * Dummy function to render the title, shows an example of setting the chrome's
   * breadcrumbs
   */
  return (
    <Switch>
      <Route exact path={'/'} component={TestPage} />
      <Route path={'/path_1'} component={TestPage} />
      <Route path={'/path_2'} component={TestPage} />
    </Switch>
  );
}

export default Routes;
