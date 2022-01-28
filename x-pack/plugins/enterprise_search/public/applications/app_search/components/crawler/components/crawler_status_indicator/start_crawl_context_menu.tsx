/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useActions } from 'kea';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from '../../crawler_logic';

export const StartCrawlContextMenu: React.FC = () => {
  const { startCrawl } = useActions(CrawlerLogic);

  return (
    <EuiButton fill onClick={startCrawl}>
      {i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.startACrawlButtonLabel',
        {
          defaultMessage: 'Start a crawl',
        }
      )}
    </EuiButton>
  );
};
