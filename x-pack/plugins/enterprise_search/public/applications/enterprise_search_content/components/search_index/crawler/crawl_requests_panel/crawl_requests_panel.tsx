/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCode, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../../../shared/data_panel/data_panel';
import { CrawlerLogic } from '../crawler_logic';

import { CrawlRequestsTable } from './crawl_requests_table';

export const CrawlRequestsPanel: React.FC = () => {
  const { data } = useValues(CrawlerLogic);
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
