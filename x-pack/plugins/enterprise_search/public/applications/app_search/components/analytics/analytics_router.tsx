/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

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
      <Route path={ENGINE_ANALYTICS_PATH} element={<Analytics />} />
      <Route path={ENGINE_ANALYTICS_TOP_QUERIES_PATH} element={<TopQueries />} />
      <Route
        path={ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH}
        element={<TopQueriesNoResults />}
      />
      <Route path={ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH} element={<TopQueriesNoClicks />} />
      <Route
        path={ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH}
        element={<TopQueriesWithClicks />}
      />

      <Route path={ENGINE_ANALYTICS_RECENT_QUERIES_PATH} element={<RecentQueries />} />
      <Route path={ENGINE_ANALYTICS_QUERY_DETAIL_PATH} element={<QueryDetail />} />
      <Route
        path={ENGINE_ANALYTICS_QUERY_DETAILS_PATH}
        element={<Navigate to={generateEnginePath(ENGINE_ANALYTICS_PATH)} />}
      />
      <Route element={<NotFound pageChrome={getEngineBreadcrumbs([ANALYTICS_TITLE])} />} />
    </Routes>
  );
};
