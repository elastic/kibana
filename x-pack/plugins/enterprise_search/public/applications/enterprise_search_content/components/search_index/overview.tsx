/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { isApiIndex, isConnectorIndex, isCrawlerIndex } from '../../utils/indices';

import { ApiTotalStats } from './api_total_stats';
import { ConnectorTotalStats } from './connector_total_stats';
import { CrawlDetailsFlyout } from './crawler/crawl_details_flyout/crawl_details_flyout';
import { CrawlRequestsPanel } from './crawler/crawl_requests_panel/crawl_requests_panel';
import { CrawlerTotalStats } from './crawler_total_stats';
import { GenerateApiKeyPanel } from './generate_api_key_panel';
import { IndexViewLogic } from './index_view_logic';
import { OverviewLogic } from './overview.logic';
import { SyncJobs } from './sync_jobs/sync_jobs';

export const SearchIndexOverview: React.FC = () => {
  const { indexData } = useValues(OverviewLogic);
  const { error } = useValues(IndexViewLogic);

  return (
    <>
      <EuiSpacer />
      {isConnectorIndex(indexData) && error && (
        <>
          <EuiCallOut
            iconType="alert"
            color="danger"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.connectorErrorCallOut.title',
              {
                defaultMessage: 'Your connector has reported an error',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">{error}</EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {isCrawlerIndex(indexData) ? (
        <CrawlerTotalStats />
      ) : isConnectorIndex(indexData) ? (
        <ConnectorTotalStats />
      ) : (
        <ApiTotalStats />
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
          <SyncJobs />
        </>
      )}
    </>
  );
};
