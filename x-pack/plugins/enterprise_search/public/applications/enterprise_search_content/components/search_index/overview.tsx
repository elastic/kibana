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

import { isApiIndex, isConnectorIndex, isCrawlerIndex } from '../../utils/indices';

import { ConnectorOverviewPanels } from './connector/connector_overview_panels';
import { CrawlDetailsFlyout } from './crawler/crawl_details_flyout/crawl_details_flyout';
import { CrawlRequestsPanel } from './crawler/crawl_requests_panel/crawl_requests_panel';
import { CrawlerTotalStats } from './crawler_total_stats';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { OverviewLogic } from './overview.logic';
import { TotalStats } from './total_stats';

export const SearchIndexOverview: React.FC = () => {
  const { indexData } = useValues(OverviewLogic);

  return (
    <>
      <EuiSpacer />
      {isCrawlerIndex(indexData) ? (
        <CrawlerTotalStats />
      ) : (
        <TotalStats
          ingestionType={
            isConnectorIndex(indexData)
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
      {isApiIndex(indexData) && (
        <>
          <EuiSpacer />
          <GenerateApiKeyPanel />
        </>
      )}
      {isCrawlerIndex(indexData) && (
        <>
          <EuiSpacer />
          <CrawlRequestsPanel />
          <CrawlDetailsFlyout />
        </>
      )}
      {isConnectorIndex(indexData) && (
        <>
          <EuiSpacer />
          <ConnectorOverviewPanels />
        </>
      )}
    </>
  );
};
