/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../shared/kibana_chrome/generate_breadcrumbs';
import { NotFound } from '../../../shared/not_found';
import {
  getEngineRoute,
  ENGINE_PATH,
  ENGINE_ANALYTICS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH,
  ENGINE_ANALYTICS_RECENT_QUERIES_PATH,
  ENGINE_ANALYTICS_QUERY_DETAILS_PATH,
  ENGINE_ANALYTICS_QUERY_DETAIL_PATH,
} from '../../routes';
import {
  ANALYTICS_TITLE,
  TOP_QUERIES,
  TOP_QUERIES_NO_RESULTS,
  TOP_QUERIES_NO_CLICKS,
  TOP_QUERIES_WITH_CLICKS,
  RECENT_QUERIES,
} from './constants';

import {
  Analytics,
  TopQueries,
  TopQueriesNoResults,
  TopQueriesNoClicks,
  TopQueriesWithClicks,
  RecentQueries,
  QueryDetail,
} from './views';

interface Props {
  engineBreadcrumb: BreadcrumbTrail;
}
export const AnalyticsRouter: React.FC<Props> = ({ engineBreadcrumb }) => {
  const ANALYTICS_BREADCRUMB = [...engineBreadcrumb, ANALYTICS_TITLE];
  const engineName = engineBreadcrumb[1];

  return (
    <Switch>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_PATH}>
        <SetPageChrome trail={ANALYTICS_BREADCRUMB} />
        <Analytics />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES]} />
        <TopQueries />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES_NO_RESULTS]} />
        <TopQueriesNoResults />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES_NO_CLICKS]} />
        <TopQueriesNoClicks />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES_WITH_CLICKS]} />
        <TopQueriesWithClicks />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_RECENT_QUERIES_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, RECENT_QUERIES]} />
        <RecentQueries />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_QUERY_DETAIL_PATH}>
        <QueryDetail breadcrumbs={ANALYTICS_BREADCRUMB} />
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_QUERY_DETAILS_PATH}>
        <Redirect to={getEngineRoute(engineName) + ENGINE_ANALYTICS_PATH} />
      </Route>
      <Route>
        <NotFound breadcrumbs={ANALYTICS_BREADCRUMB} product={APP_SEARCH_PLUGIN} />
      </Route>
    </Switch>
  );
};
