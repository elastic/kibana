/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiCode, EuiSpacer, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { DeleteDomainPanel } from './components/delete_domain_panel';
import { ManageCrawlsPopover } from './components/manage_crawls_popover/manage_crawls_popover';
import { CRAWLER_TITLE } from './constants';
import { CrawlerSingleDomainLogic } from './crawler_single_domain_logic';

export const CrawlerSingleDomain: React.FC = () => {
  const { domainId } = useParams() as { domainId: string };

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
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.singleDomain.deleteDomainTitle',
            {
              defaultMessage: 'Delete domain',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <DeleteDomainPanel />
      <EuiSpacer size="xl" />
      <EuiCode>{JSON.stringify(domain, null, 2)}</EuiCode>
    </AppSearchPageTemplate>
  );
};
