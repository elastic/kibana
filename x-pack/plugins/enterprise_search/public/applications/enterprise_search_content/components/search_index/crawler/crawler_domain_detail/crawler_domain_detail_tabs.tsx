/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiSpacer, EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlerDomain } from '../../../../api/crawler/types';

import { AuthenticationPanel } from './authentication_panel/authentication_panel';
import { CrawlRulesTable } from './crawl_rules_table';
import { DeduplicationPanel } from './deduplication_panel/deduplication_panel';
import { EntryPointsTable } from './entry_points_table';
import { SitemapsTable } from './sitemaps_table';

export enum CrawlerDomainTabId {
  ENTRY_POINTS = 'entry_points',
  AUTHENTICATION = 'authentication',
  SITE_MAPS = 'site_maps',
  CRAWL_RULES = 'crawl_rules',
  DEDUPLICATION = 'deduplication',
}

export interface CrawlerDomainDetailTabsProps {
  domain: CrawlerDomain;
  indexName: string;
}

export const CrawlerDomainDetailTabs: React.FC<CrawlerDomainDetailTabsProps> = ({
  domain,
  indexName,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const tabs = [
    {
      content: (
        <>
          <EuiSpacer />
          <EntryPointsTable domain={domain} indexName={indexName} items={domain.entryPoints} />
        </>
      ),
      id: CrawlerDomainTabId.ENTRY_POINTS,
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.entryPoints', {
        defaultMessage: 'Entry points',
      }),
    },
    {
      content: (
        <>
          <EuiSpacer />
          <AuthenticationPanel />
        </>
      ),
      id: CrawlerDomainTabId.AUTHENTICATION,
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.authentication', {
        defaultMessage: 'Authentication',
      }),
    },
    {
      content: (
        <>
          <EuiSpacer />
          <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
        </>
      ),
      id: CrawlerDomainTabId.SITE_MAPS,
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.siteMaps', {
        defaultMessage: 'Site maps',
      }),
    },
    {
      content: (
        <>
          <EuiSpacer />
          <CrawlRulesTable
            domainId={domain.id}
            indexName={indexName}
            crawlRules={domain.crawlRules}
            defaultCrawlRule={domain.defaultCrawlRule}
          />
        </>
      ),
      id: CrawlerDomainTabId.CRAWL_RULES,
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.crawlRules', {
        defaultMessage: 'Crawl rules',
      }),
    },
    {
      content: <DeduplicationPanel />,
      id: CrawlerDomainTabId.DEDUPLICATION,
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.deduplication', {
        defaultMessage: 'Duplicate document handling',
      }),
    },
  ];
  return (
    <EuiTabbedContent
      tabs={tabs}
      selectedTab={tabs[tabIndex]}
      onTabClick={(tab: EuiTabbedContentTab) => {
        setTabIndex(tabs.findIndex(({ id }) => id === tab.id) || 0);
      }}
    />
  );
};
