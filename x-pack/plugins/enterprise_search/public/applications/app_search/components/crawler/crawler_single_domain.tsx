/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiCode, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { CrawlerStatusBanner } from './components/crawler_status_banner';
import { CrawlerStatusIndicator } from './components/crawler_status_indicator/crawler_status_indicator';
import { CRAWLER_TITLE } from './constants';
import { CrawlerSingleDomainLogic } from './crawler_single_domain_logic';

export const CrawlerSingleDomain: React.FC = () => {
  const { domainId } = useParams() as { domainId: string };

  const { dataLoading, domain } = useValues(CrawlerSingleDomainLogic);

  const { fetchDomainData } = useActions(CrawlerSingleDomainLogic);

  const displayDomainUrl = domain
    ? domain.url
    : i18n.translate('xpack.enterpriseSearch.appSearch.crawler.singleDomain.loadingTitle', {
        defaultMessage: 'Loading...',
      });

  useEffect(() => {
    fetchDomainData(domainId);
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([CRAWLER_TITLE, displayDomainUrl])}
      pageHeader={{ pageTitle: displayDomainUrl, rightSideItems: [<CrawlerStatusIndicator />] }}
      isLoading={dataLoading}
    >
      <CrawlerStatusBanner />
      <EuiSpacer size="l" />
      <EuiCode>{JSON.stringify(domain, null, 2)}</EuiCode>
    </AppSearchPageTemplate>
  );
};
