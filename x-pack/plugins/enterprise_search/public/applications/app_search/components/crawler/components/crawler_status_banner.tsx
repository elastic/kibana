/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut } from '@elastic/eui';

import { CrawlerOverviewLogic } from '../crawler_overview_logic';
import { CrawlerStatus } from '../types';

export const CrawlerStatusBanner: React.FC = () => {
  const { mostRecentCrawlRequestStatus } = useValues(CrawlerOverviewLogic);
  if (
    mostRecentCrawlRequestStatus === CrawlerStatus.Running ||
    mostRecentCrawlRequestStatus === CrawlerStatus.Starting ||
    mostRecentCrawlRequestStatus === CrawlerStatus.Canceling
  ) {
    return (
      <EuiCallOut
        iconType="iInCircle"
        title="Changes you make now won't take effect until the start of your next crawl."
      />
    );
  }
  return null;
};
