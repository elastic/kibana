/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiCode, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-locators';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { KibanaDeps } from '../../../../../../../common/types';
import { DataPanel } from '../../../../../shared/data_panel/data_panel';
import { CrawlerLogic } from '../crawler_logic';

import { CrawlRequestsTable } from './crawl_requests_table';

const CRAWLER_LOGS_DISCOVER_RECORD = {
  columns: [
    '@timestamp',
    'crawler.crawl.id',
    'url.domain',
    'url.path',
    'event.action',
    'http.response.status_code',
  ],
  dataViewSpec: {
    name: i18n.translate(
      'xpack.enterpriseSearch.crawler.crawlRequestsPanel.discoverCrawlerLogsTitle',
      {
        defaultMessage: 'All Crawler Logs',
      }
    ),
    timeFieldName: '@timestamp',
    title: 'logs-elastic_crawler-default',
  },
  sort: [['@timestamp', 'desc']],
};

export const CrawlRequestsPanel: React.FC = () => {
  const { data } = useValues(CrawlerLogic);
  const {
    services: { share },
  } = useKibana<KibanaDeps>();
  const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);

  return (
    <DataPanel
      hasBorder
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.crawler.crawlRequestsPanel.title', {
            defaultMessage: 'Crawl requests',
          })}
        </h2>
      }
      titleSize="s"
      iconType="documents"
      action={
        <EuiButton onClick={() => locator?.navigate(CRAWLER_LOGS_DISCOVER_RECORD)}>
          {i18n.translate('xpack.enterpriseSearch.crawler.crawlRequestsPanel.linkToDiscover', {
            defaultMessage: 'View in Discover',
          })}
        </EuiButton>
      }
      subtitle={i18n.translate('xpack.enterpriseSearch.crawler.crawlRequestsPanel.description', {
        defaultMessage:
          "Recent crawl requests are logged here. You can track progress and examine crawl events in Kibana's Discover or Logs user intefaces",
      })}
    >
      <EuiPanel color="subdued">
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlRequestsPanel.userAgentDescription',
            {
              defaultMessage:
                'Requests originating from the crawler can be identified by the following User Agent. This is configured in your enterprise-search.yml file.',
            }
          )}{' '}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCode>{data ? data.userAgent : ''}</EuiCode>
      </EuiPanel>
      <EuiSpacer />
      <CrawlRequestsTable />
    </DataPanel>
  );
};
