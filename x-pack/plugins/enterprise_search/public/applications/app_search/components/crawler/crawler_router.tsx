/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { CrawlerLanding } from './crawler_landing';
import { CrawlerOverview } from './crawler_overview';

export const CrawlerRouter: React.FC = () => {
  return (
    <Switch>
      <Route>
        {process.env.NODE_ENV === 'development' ? <CrawlerOverview /> : <CrawlerLanding />}
      </Route>
    </Switch>
  );
};
