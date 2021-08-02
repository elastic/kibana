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
import { CrawlRequestsTable } from './components/crawl_requests_table';
import { DomainsTable } from './components/domains_table';
import { CRAWLER_TITLE } from './constants';
import { CrawlerOverviewLogic } from './crawler_overview_logic';

export const CrawlerOverview: React.FC = () => {
  const { dataLoading } = useValues(CrawlerOverviewLogic);

  const { fetchCrawlerData } = useActions(CrawlerOverviewLogic);

  useEffect(() => {
    fetchCrawlerData();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([CRAWLER_TITLE])}
      pageHeader={{ pageTitle: CRAWLER_TITLE }}
      isLoading={dataLoading}
    >
      <EuiFlexGroup direction="row" alignItems="stretch">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.domainsTitle', {
                defaultMessage: 'Domains',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDomainFlyout />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DomainsTable />
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.crawlRequestsTitle', {
            defaultMessage: 'Recent Crawl Requests',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.crawlRequestsDescription', {
            defaultMessage:
              "Recent crawl requests are logged here. Using the request ID of each crawl, you can track progress and examine crawl events in Kibana's Discover or Logs user interfaces. ",
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
    </AppSearchPageTemplate>
  );
};
