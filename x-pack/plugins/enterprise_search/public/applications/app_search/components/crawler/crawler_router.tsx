/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { getEngineBreadcrumbs } from '../engine';

import { CRAWLER_TITLE } from './constants';
import { CrawlerLanding } from './crawler_landing';

export const CrawlerRouter: React.FC = () => {
  return (
    <Switch>
      <Route>
        <SetPageChrome trail={getEngineBreadcrumbs([CRAWLER_TITLE])} />
        <CrawlerLanding />
      </Route>
    </Switch>
  );
};
