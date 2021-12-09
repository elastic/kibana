/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlEvent, CrawlType, readableCrawlTypes } from '../types';

export const CrawlEventTypeBadge: React.FC<{ event: CrawlEvent }> = ({ event }) => {
  if (event.stage === 'process') {
    return (
      <EuiBadge color="hollow">
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.crawlTypeOptions.reAppliedCrawlRules',
          {
            defaultMessage: 'Re-applied crawl rules',
          }
        )}
      </EuiBadge>
    );
  }
  if (event.type === CrawlType.Full) {
    return <EuiBadge>{readableCrawlTypes[CrawlType.Full]}</EuiBadge>;
  }
  if (event.type === CrawlType.Partial) {
    return <EuiBadge color="hollow">{readableCrawlTypes[CrawlType.Partial]}</EuiBadge>;
  }
  return null;
};
