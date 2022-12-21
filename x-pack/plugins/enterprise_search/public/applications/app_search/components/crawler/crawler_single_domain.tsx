/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { EngineLogic, getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { CrawlCustomSettingsFlyout } from './components/crawl_custom_settings_flyout/crawl_custom_settings_flyout';
import { CrawlRulesTable } from './components/crawl_rules_table';
import { CrawlSelectDomainsModal } from './components/crawl_select_domains_modal/crawl_select_domains_modal';
import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DeduplicationPanel } from './components/deduplication_panel';
import { DeleteDomainPanel } from './components/delete_domain_panel';
import { EntryPointsTable } from './components/entry_points_table';
import { ManageCrawlsPopover } from './components/manage_crawls_popover/manage_crawls_popover';
import { SitemapsTable } from './components/sitemaps_table';
import { CRAWLER_TITLE } from './constants';
import { CrawlerSingleDomainLogic } from './crawler_single_domain_logic';

export const CrawlerSingleDomain: React.FC = () => {
  const { domainId } = useParams() as { domainId: string };
  const { engineName } = EngineLogic.values;

  const { dataLoading, domain } = useValues(CrawlerSingleDomainLogic);

  const { fetchDomainData } = useActions(CrawlerSingleDomainLogic);

  useEffect(() => {
    fetchDomainData(domainId);
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([CRAWLER_TITLE, domain?.url || '...'])}
      pageHeader={
        dataLoading
          ? undefined
          : {
              pageTitle: domain!.url,
              rightSideItems: [<ManageCrawlsPopover />, <CrawlerStatusIndicator />],
            }
      }
      isLoading={dataLoading}
    >
      <CrawlerStatusBanner />
      <EuiSpacer size="l" />
      {domain && (
        <>
          <EuiPanel paddingSize="l" hasBorder>
            <EntryPointsTable domain={domain} engineName={engineName} items={domain.entryPoints} />
          </EuiPanel>
          <EuiSpacer size="xl" />
          <EuiPanel paddingSize="l" hasBorder>
            <SitemapsTable domain={domain} engineName={engineName} items={domain.sitemaps} />
          </EuiPanel>
          <EuiSpacer size="xl" />
          <EuiPanel paddingSize="l" hasBorder>
            <CrawlRulesTable
              domainId={domainId}
              engineName={engineName}
              crawlRules={domain.crawlRules}
              defaultCrawlRule={domain.defaultCrawlRule}
            />
          </EuiPanel>
          <EuiSpacer size="xxl" />
        </>
      )}
      <DeduplicationPanel />
      <EuiSpacer size="xl" />
      <DeleteDomainPanel />
      <CrawlSelectDomainsModal />
      <CrawlCustomSettingsFlyout />
    </AppSearchPageTemplate>
  );
};
