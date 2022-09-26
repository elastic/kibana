/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { WEB_CRAWLER_DOCS_URL, WEB_CRAWLER_LOG_DOCS_URL } from '../../routes';
import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { AddDomainFlyout } from './components/add_domain/add_domain_flyout';
import { AddDomainForm } from './components/add_domain/add_domain_form';
import { AddDomainFormErrors } from './components/add_domain/add_domain_form_errors';
import { AddDomainFormSubmitButton } from './components/add_domain/add_domain_form_submit_button';
import { AddDomainLogic } from './components/add_domain/add_domain_logic';
import { CrawlCustomSettingsFlyout } from './components/crawl_custom_settings_flyout/crawl_custom_settings_flyout';
import { CrawlDetailsFlyout } from './components/crawl_details_flyout';
import { CrawlRequestsTable } from './components/crawl_requests_table';
import { CrawlSelectDomainsModal } from './components/crawl_select_domains_modal/crawl_select_domains_modal';
import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DomainsTable } from './components/domains_table';
import { ManageCrawlsPopover } from './components/manage_crawls_popover/manage_crawls_popover';
import { CRAWLER_TITLE } from './constants';
import { CrawlerLogic } from './crawler_logic';

export const CrawlerOverview: React.FC = () => {
  const { events, dataLoading, domains } = useValues(CrawlerLogic);
  const { errors: addDomainErrors } = useValues(AddDomainLogic);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([CRAWLER_TITLE])}
      pageHeader={{
        pageTitle: CRAWLER_TITLE,
        rightSideItems: [<ManageCrawlsPopover />, <CrawlerStatusIndicator />],
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
              <EuiLink external target="_blank" href={WEB_CRAWLER_DOCS_URL}>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.empty.crawlerDocumentationLinkDescription',
                  {
                    defaultMessage: 'Learn more about the web crawler',
                  }
                )}
              </EuiLink>
            </p>
          </EuiText>
          {addDomainErrors && (
            <>
              <EuiSpacer size="l" />
              <AddDomainFormErrors />
            </>
          )}
          <EuiSpacer size="l" />
          <AddDomainForm />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <AddDomainFormSubmitButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {(events.length > 0 || domains.length > 0) && (
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
              <EuiLink href={WEB_CRAWLER_LOG_DOCS_URL} target="_blank" external>
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
      <CrawlDetailsFlyout />
      <CrawlSelectDomainsModal />
      <CrawlCustomSettingsFlyout />
    </AppSearchPageTemplate>
  );
};
