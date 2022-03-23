/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from '../../crawler_logic';
import { CrawlerStatus } from '../../types';

import { StartCrawlContextMenu } from './start_crawl_context_menu';
import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

export const CrawlerStatusIndicator: React.FC = () => {
  const { domains, mostRecentCrawlRequestStatus } = useValues(CrawlerLogic);
  const { stopCrawl } = useActions(CrawlerLogic);

  const disabledButton = (
    <EuiButton disabled iconType="arrowDown" iconSide="right">
      {i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.startACrawlButtonLabel',
        {
          defaultMessage: 'Start a crawl',
        }
      )}
    </EuiButton>
  );

  if (domains.length === 0) {
    return disabledButton;
  }

  switch (mostRecentCrawlRequestStatus) {
    case CrawlerStatus.Success:
      return (
        <StartCrawlContextMenu
          menuButtonLabel={i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.startCrawlContextMenu.startACrawlButtonLabel',
            {
              defaultMessage: 'Start a crawl',
            }
          )}
        />
      );
    case CrawlerStatus.Failed:
    case CrawlerStatus.Canceled:
      return (
        <StartCrawlContextMenu
          fill
          menuButtonLabel={i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.retryCrawlButtonLabel',
            {
              defaultMessage: 'Retry crawl',
            }
          )}
        />
      );
    case CrawlerStatus.Pending:
    case CrawlerStatus.Suspended:
      return (
        <EuiButton disabled isLoading>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.pendingButtonLabel',
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
            'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.startingButtonLabel',
            {
              defaultMessage: 'Starting...',
            }
          )}
        </EuiButton>
      );
    case CrawlerStatus.Running:
      return <StopCrawlPopoverContextMenu stopCrawl={stopCrawl} />;
    case CrawlerStatus.Canceling:
    case CrawlerStatus.Suspending:
      return (
        <EuiButton isLoading fill>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.stoppingButtonLabel',
            {
              defaultMessage: 'Stopping...',
            }
          )}
        </EuiButton>
      );
    default:
      // We should never get here, you would have to pass a CrawlerStatus option not covered
      // in the switch cases above
      return disabledButton;
  }
};
