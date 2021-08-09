/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DOCS_PREFIX } from '../../routes';
import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { AddDomainFlyout } from './components/add_domain/add_domain_flyout';
import { AddDomainForm } from './components/add_domain/add_domain_form';
import { AddDomainFormSubmitButton } from './components/add_domain/add_domain_form_submit_button';
import { CrawlRequestsTable } from './components/crawl_requests_table';
import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DomainsTable } from './components/domains_table';
import { CRAWLER_TITLE } from './constants';
import { CrawlerOverviewLogic } from './crawler_overview_logic';

export const CrawlerOverview: React.FC = () => {
  const { crawlRequests, dataLoading, domains } = useValues(CrawlerOverviewLogic);

  const { fetchCrawlerData, getLatestCrawlRequests } = useActions(CrawlerOverviewLogic);

  useEffect(() => {
    fetchCrawlerData();
    getLatestCrawlRequests(false);
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([CRAWLER_TITLE])}
      pageHeader={{
        pageTitle: CRAWLER_TITLE,
        rightSideItems: [<CrawlerStatusIndicator />],
      }}
      isLoading={dataLoading}
    >
      <CrawlerStatusBanner />
      <EuiSpacer size="l" />
      {domains.length > 0 ? (
        <>
          <EuiFlexGroup direction="row" alignItems="stretch">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.domainsTitle', {
                    defaultMessage: 'Domains',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AddDomainFlyout />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <DomainsTable />
        </>
      ) : (
        <>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.empty.title', {
                defaultMessage: 'Add a domain to get started',
              })}
            </h2>
          </EuiTitle>
          <EuiText>
            <p>
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.empty.description', {
                defaultMessage:
                  "Easily index your website's content. To get started, enter your domain name, provide optional entry points and crawl rules, and we will handle the rest.",
              })}{' '}
              <EuiLink external target="_blank" href={`${DOCS_PREFIX}/web-crawler.html`}>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.empty.crawlerDocumentationLinkDescription',
                  {
                    defaultMessage: 'Learn more about the web crawler',
                  }
                )}
              </EuiLink>
            </p>
          </EuiText>
          <AddDomainForm />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <AddDomainFormSubmitButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {(crawlRequests.length > 0 || domains.length > 0) && (
        <>
          <EuiSpacer size="xl" />
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTitle', {
                defaultMessage: 'Recent crawl requests',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText color="subdued" size="s">
            <p>
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.crawlRequestsDescription', {
                defaultMessage:
                  "Recent crawl requests are logged here. Using the request ID of each crawl, you can track progress and examine crawl events in Kibana's Discover or Logs user interfaces.",
              })}{' '}
              <EuiLink
                href={`${DOCS_PREFIX}/view-web-crawler-events-logs.html`}
                target="_blank"
                external
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.configurationDocumentationLinkDescription',
                  {
                    defaultMessage: 'Learn more about configuring crawler logs in Kibana',
                  }
                )}
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <CrawlRequestsTable />
        </>
      )}
    </AppSearchPageTemplate>
  );
};
