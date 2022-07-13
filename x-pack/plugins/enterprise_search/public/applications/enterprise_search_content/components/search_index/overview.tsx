/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { Status } from '../../../../../common/types/api';
import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';

import { CrawlDetailsFlyout } from './crawler/crawl_details_flyout/crawl_details_flyout';
import { CrawlRequestsPanel } from './crawler/crawl_requests_panel/crawl_requests_panel';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const { data, status } = useValues(FetchIndexApiLogic);

  const isCrawler = typeof data?.crawler !== 'undefined';
  const isConnector = typeof data?.connector !== 'undefined';
  const isApi = !(isCrawler || isConnector);

  return (
    <>
      <EuiSpacer />
      {status === Status.SUCCESS && data && (
        <TotalStats
          lastUpdated={'TODO'}
          documentCount={data.index.total.docs.count ?? 0}
          indexHealth={data.index.health ?? ''}
          ingestionType={data.connector ? 'Connector' : data.crawler ? 'Crawler' : 'API'}
        />
      )}
      <EuiSpacer />
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
