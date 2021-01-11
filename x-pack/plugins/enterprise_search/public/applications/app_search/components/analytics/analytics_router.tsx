/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import {
  ENGINE_PATH,
  ENGINE_ANALYTICS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH,
  ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH,
  ENGINE_ANALYTICS_RECENT_QUERIES_PATH,
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

interface Props {
  engineBreadcrumb: string[];
}
export const AnalyticsRouter: React.FC<Props> = ({ engineBreadcrumb }) => {
  const ANALYTICS_BREADCRUMB = [...engineBreadcrumb, ANALYTICS_TITLE];

  return (
    <Switch>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_PATH}>
        <SetPageChrome trail={ANALYTICS_BREADCRUMB} />
        TODO: Analytics overview
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES]} />
        TODO: Top queries
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_NO_RESULTS_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES_NO_RESULTS]} />
        TODO: Top queries with no results
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_NO_CLICKS_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES_NO_CLICKS]} />
        TODO: Top queries with no clicks
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_TOP_QUERIES_WITH_CLICKS_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, TOP_QUERIES_WITH_CLICKS]} />
        TODO: Top queries with clicks
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_RECENT_QUERIES_PATH}>
        <SetPageChrome trail={[...ANALYTICS_BREADCRUMB, RECENT_QUERIES]} />
        TODO: Recent queries
      </Route>
      <Route exact path={ENGINE_PATH + ENGINE_ANALYTICS_QUERY_DETAIL_PATH}>
        TODO: Query detail page
      </Route>
    </Switch>
  );
};
