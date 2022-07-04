/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { Status } from '../../../../../common/types/api';
import { GetCrawlerDomainApiLogic } from '../../api/crawler/get_crawler_domain_api_logic';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';

export const CrawlerDomainDetail: React.FC = () => {
  const { makeRequest, apiReset } = useActions(GetCrawlerDomainApiLogic);
  const { data: domainData, status: domainApiStatus } = useValues(GetCrawlerDomainApiLogic);
  const { domainId, indexName } = useParams<{
    domainId: string;
    indexName: string;
  }>();

  useEffect(() => {
    makeRequest({ domainId, indexName });
    return apiReset;
  }, [indexName]);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName, domainData?.url ?? '...']}
      isLoading={domainApiStatus === Status.LOADING || domainApiStatus === Status.IDLE}
      pageHeader={{ pageTitle: indexName }}
    />
  );
};
