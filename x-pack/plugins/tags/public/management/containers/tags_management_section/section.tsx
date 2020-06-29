/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { LandingPage } from '../landing_page';
import { CreateNewPage } from '../create_new_page';

export const Section: React.FC = () => {
  return (
    <div data-test-subj="TagsManagementSection">
      <Switch>
        <Route path={['', '/']} exact>
          <LandingPage />
        </Route>
        <Route path="/create">
          <CreateNewPage />
        </Route>
      </Switch>
    </div>
  );
};
