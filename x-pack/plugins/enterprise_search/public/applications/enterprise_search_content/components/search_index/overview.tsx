/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { CrawlDetailsFlyout } from './crawler/crawl_details_flyout/crawl_details_flyout';
import { CrawlRequestsPanel } from './crawler/crawl_requests_panel/crawl_requests_panel';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { OverviewLogic } from './overview.logic';
import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const { indexData, isSuccess } = useValues(OverviewLogic);

  const isCrawler = typeof indexData?.crawler !== 'undefined';
  const isConnector = typeof indexData?.connector !== 'undefined';
  const isApi = !(isCrawler || isConnector);

  return (
    <>
      <EuiSpacer />
      {isSuccess && (
        <>
          <EuiSpacer />
          <TotalStats
            documentCount={indexData.index.total.docs.count ?? 0}
            indexHealth={indexData.index.health ?? ''}
            ingestionType={
              indexData.connector ? 'Connector' : indexData.crawler ? 'Crawler' : 'API'
            }
          />
        </>
      )}
      {isApi && <GenerateApiKeyPanel />}
      {isCrawler && (
        <>
          <CrawlRequestsPanel />
          <CrawlDetailsFlyout />
        </>
      )}
    </>
  );
};
