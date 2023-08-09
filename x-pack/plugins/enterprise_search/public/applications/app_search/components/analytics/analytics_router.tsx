/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { Routes, Route } from '@kbn/shared-ux-router';

import {
  ENGINE_ANALYTICS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH,
  ENGINE_ANALYTICS_RECENT_QUERIES_PATH,
  ENGINE_ANALYTICS_QUERY_DETAILS_PATH,
  ENGINE_ANALYTICS_QUERY_DETAIL_PATH,
} from '../../routes';
import { generateEnginePath, getEngineBreadcrumbs } from '../engine';
import { NotFound } from '../not_found';

import { ANALYTICS_TITLE } from './constants';
import {
  Analytics,
  TopQueries,
  TopQueriesNoResults,
  TopQueriesNoClicks,
  TopQueriesWithClicks,
  RecentQueries,
  QueryDetail,
} from './views';

export const AnalyticsRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={ENGINE_ANALYTICS_PATH}>
        <Analytics />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_TOP_QUERIES_PATH}>
        <TopQueries />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH}>
        <TopQueriesNoResults />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH}>
        <TopQueriesNoClicks />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH}>
        <TopQueriesWithClicks />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_RECENT_QUERIES_PATH}>
        <RecentQueries />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_QUERY_DETAIL_PATH}>
        <QueryDetail />
      </Route>
      <Route exact path={ENGINE_ANALYTICS_QUERY_DETAILS_PATH}>
        <Redirect to={generateEnginePath(ENGINE_ANALYTICS_PATH)} />
      </Route>
      <Route>
        <NotFound pageChrome={getEngineBreadcrumbs([ANALYTICS_TITLE])} />
      </Route>
    </Routes>
  );
};
