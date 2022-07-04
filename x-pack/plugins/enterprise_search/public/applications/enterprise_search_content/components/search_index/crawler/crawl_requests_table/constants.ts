/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CrawlerStatus, CrawlType } from '../../../../api/crawler/types';

export const readableCrawlTypes: { [key in CrawlType]: string } = {
  [CrawlType.Full]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlTypeOptions.full',
    { defaultMessage: 'Full' }
  ),
  [CrawlType.Partial]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlTypeOptions.partial',
    { defaultMessage: 'Partial' }
  ),
};

export const readableCrawlerStatuses: { [key in CrawlerStatus]: string } = {
  [CrawlerStatus.Pending]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.pending',
    { defaultMessage: 'Pending' }
  ),
  [CrawlerStatus.Suspended]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.suspended',
    { defaultMessage: 'Suspended' }
  ),
  [CrawlerStatus.Starting]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.starting',
    { defaultMessage: 'Starting' }
  ),
  [CrawlerStatus.Running]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.running',
    { defaultMessage: 'Running' }
  ),
  [CrawlerStatus.Suspending]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.suspending',
    { defaultMessage: 'Suspending' }
  ),
  [CrawlerStatus.Canceling]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.canceling',
    { defaultMessage: 'Canceling' }
  ),
  [CrawlerStatus.Success]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.success',
    { defaultMessage: 'Success' }
  ),
  [CrawlerStatus.Failed]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.failed',
    { defaultMessage: 'Failed' }
  ),
  [CrawlerStatus.Canceled]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.canceled',
    { defaultMessage: 'Canceled' }
  ),
  [CrawlerStatus.Skipped]: i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusOptions.skipped',
    { defaultMessage: 'Skipped' }
  ),
};
