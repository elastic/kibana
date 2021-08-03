/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton } from '@elastic/eui';

import { CrawlerOverviewLogic } from '../../crawler_overview_logic';
import { CrawlerStatus } from '../../types';

import { StopCrawlPopoverContextMenu } from './stop_crawl_popover_context_menu';

export const CrawlerStatusIndicator: React.FC = () => {
  const { domains, mostRecentCrawlRequestStatus } = useValues(CrawlerOverviewLogic);
  const { startCrawl, stopCrawl } = useActions(CrawlerOverviewLogic);

  const disabledButton = <EuiButton disabled>Start a Crawl</EuiButton>;

  if (domains.length === 0) {
    return disabledButton;
  }

  switch (mostRecentCrawlRequestStatus) {
    case CrawlerStatus.Success:
      return (
        <EuiButton fill onClick={startCrawl}>
          Start a Crawl
        </EuiButton>
      );
    case CrawlerStatus.Failed:
    case CrawlerStatus.Canceled:
      return (
        <EuiButton fill onClick={startCrawl}>
          Retry Crawl
        </EuiButton>
      );
    case CrawlerStatus.Pending:
    case CrawlerStatus.Suspended:
      return (
        <EuiButton disabled isLoading>
          Pending...
        </EuiButton>
      );
    case CrawlerStatus.Starting:
      return <EuiButton isLoading>Starting...</EuiButton>;
    case CrawlerStatus.Running:
      return <StopCrawlPopoverContextMenu stopCrawl={stopCrawl} />;
    case CrawlerStatus.Canceling:
    case CrawlerStatus.Suspending:
      return (
        <EuiButton isLoading fill>
          Stopping...
        </EuiButton>
      );
    default:
      // We should never get here
      return disabledButton;
  }
};
