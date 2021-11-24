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

export const CrawlDetailsPreview: React.FC = () => {
  const { crawlRequest } = useValues(CrawlDetailLogic);

  if (crawlRequest === null) {
    return null;
  }

  return (
    <>
      <AccordionList
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
