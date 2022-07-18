/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlDetailsFlyout } from './crawler/crawl_details_flyout/crawl_details_flyout';
import { CrawlRequestsPanel } from './crawler/crawl_requests_panel/crawl_requests_panel';
import { CrawlerTotalStats } from './crawler_total_stats';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { OverviewLogic } from './overview.logic';
import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const { indexData } = useValues(OverviewLogic);

  const isCrawler = typeof indexData?.crawler !== 'undefined';
  const isConnector = typeof indexData?.connector !== 'undefined';
  const isApi = !(isCrawler || isConnector);

  return (
    <>
      <EuiSpacer />
      {isCrawler ? (
        <CrawlerTotalStats />
      ) : (
        <TotalStats
          ingestionType={
            isConnector
              ? i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndex.totalStats.connectorIngestionMethodLabel',
                  {
                    defaultMessage: 'Connector',
                  }
                )
              : i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndex.totalStats.apiIngestionMethodLabel',
                  {
                    defaultMessage: 'API',
                  }
                )
          }
        />
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
