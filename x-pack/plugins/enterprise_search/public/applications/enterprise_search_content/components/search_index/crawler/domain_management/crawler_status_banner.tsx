/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerStatus } from '../../../../api/crawler/types';
import { CrawlerLogic } from '../crawler_logic';

export const CrawlerStatusBanner: React.FC = () => {
  const { mostRecentCrawlRequestStatus } = useValues(CrawlerLogic);
  if (
    mostRecentCrawlRequestStatus === CrawlerStatus.Running ||
    mostRecentCrawlRequestStatus === CrawlerStatus.Starting ||
    mostRecentCrawlRequestStatus === CrawlerStatus.Canceling
  ) {
    return (
      <>
        <EuiCallOut
          iconType="iInCircle"
          title={i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlerStatusBanner.changesCalloutTitle',
            {
              defaultMessage:
                "Changes you make now won't take effect until the start of your next crawl.",
            }
          )}
        />
        <EuiSpacer size="l" />
      </>
    );
  }
  return null;
};
