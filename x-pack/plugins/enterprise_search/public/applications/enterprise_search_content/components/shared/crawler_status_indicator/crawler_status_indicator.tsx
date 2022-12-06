/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerStatus } from '../../../api/crawler/types';
import { CrawlerLogic } from '../../search_index/crawler/crawler_logic';

import { StartCrawlContextMenu } from './start_crawl_context_menu';
import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

export const CrawlerStatusIndicator: React.FC = () => {
  const { dataLoading, domains, mostRecentCrawlRequestStatus } = useValues(CrawlerLogic);

  if (dataLoading || domains.length === 0) {
    return (
      <EuiButton disabled iconType="arrowDown" iconSide="right">
        {i18n.translate(
          'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.startACrawlButtonLabel',
          {
            defaultMessage: 'Crawl',
          }
        )}
      </EuiButton>
    );
  }

  switch (mostRecentCrawlRequestStatus) {
    case CrawlerStatus.Pending:
    case CrawlerStatus.Suspended:
      return (
        <EuiButton isLoading>
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.pendingButtonLabel',
            {
              defaultMessage: 'Pending...',
            }
          )}
        </EuiButton>
      );
    case CrawlerStatus.Starting:
      return (
        <EuiButton isLoading>
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.startingButtonLabel',
            {
              defaultMessage: 'Starting...',
            }
          )}
        </EuiButton>
      );
    case CrawlerStatus.Running:
      return <StopCrawlPopoverContextMenu />;
    case CrawlerStatus.Canceling:
    case CrawlerStatus.Suspending:
      return (
        <EuiButton isLoading>
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.stoppingButtonLabel',
            {
              defaultMessage: 'Stopping...',
            }
          )}
        </EuiButton>
      );
    case CrawlerStatus.Success:
    case CrawlerStatus.Failed:
    case CrawlerStatus.Canceled:
    default:
      return <StartCrawlContextMenu />;
  }
};
