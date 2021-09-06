/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import { useActions } from 'kea';

import { ENGINE_CRAWLER_DOMAIN_PATH, ENGINE_CRAWLER_PATH } from '../../routes';

import { CrawlerLogic } from './crawler_logic';

import { CrawlerOverview } from './crawler_overview';
import { CrawlerSingleDomain } from './crawler_single_domain';

export const CrawlerRouter: React.FC = () => {
  const { fetchCrawlerData, getLatestCrawlRequests } = useActions(CrawlerLogic);

  useEffect(() => {
    fetchCrawlerData();
    getLatestCrawlRequests(false);
  }, []);

  return (
    <Switch>
      <Route exact path={ENGINE_CRAWLER_PATH}>
        <CrawlerOverview />
      </Route>
      <Route exact path={ENGINE_CRAWLER_DOMAIN_PATH}>
        <CrawlerSingleDomain />
      </Route>
    </Switch>
  );
};
