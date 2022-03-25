/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlDetailLogic } from '../../crawl_detail_logic';

import { AccordionList } from './accordion_list';
import { CrawlDetailsSummary } from './crawl_details_summary';

interface CrawlDetailsPreviewProps {
  crawlerLogsEnabled?: boolean;
}

export const CrawlDetailsPreview: React.FC<CrawlDetailsPreviewProps> = ({
  crawlerLogsEnabled = false,
}) => {
  const { crawlRequest } = useValues(CrawlDetailLogic);

  if (crawlRequest === null) {
    return null;
  }

  return (
    <>
      <CrawlDetailsSummary
        crawlerLogsEnabled={crawlerLogsEnabled}
        crawlType={crawlRequest.type}
        domainCount={crawlRequest.crawlConfig.domainAllowlist.length}
        crawlDepth={crawlRequest.crawlConfig.maxCrawlDepth}
        stats={crawlRequest.stats || null}
      />
      <EuiSpacer />
      <AccordionList
        hasBorder
        initialIsOpen={crawlRequest.crawlConfig.domainAllowlist.length > 0}
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsPreview.domainsTitle',
          {
            defaultMessage: 'Domains',
          }
        )}
        iconType="globe"
        items={crawlRequest.crawlConfig.domainAllowlist}
      />
      <EuiSpacer size="s" />
      <AccordionList
        hasBorder
        initialIsOpen={crawlRequest.crawlConfig.seedUrls.length > 0}
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsPreview.seedUrlsTitle',
          {
            defaultMessage: 'Seed URLs',
          }
        )}
        iconType="crosshairs"
        items={crawlRequest.crawlConfig.seedUrls}
      />
      <EuiSpacer size="s" />
      <AccordionList
        hasBorder
        initialIsOpen={crawlRequest.crawlConfig.sitemapUrls.length > 0}
        title={i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsPreview.sitemapUrlsTitle',
          {
            defaultMessage: 'Sitemap URLs',
          }
        )}
        iconType="visMapRegion"
        items={crawlRequest.crawlConfig.sitemapUrls}
      />
    </>
  );
};
