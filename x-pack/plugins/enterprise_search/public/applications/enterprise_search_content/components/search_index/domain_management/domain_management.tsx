/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { Loading } from '../../../../shared/loading';

import { GetCrawlerDomainsApiLogic } from '../../../api/crawler/get_crawler_domains_api_logic';

import { DomainManagementLogic } from './domain_management_logic';

export const SearchIndexDomainManagement: React.FC = () => {
  const { indexName } = useParams<{
    indexName: string;
  }>();

  GetCrawlerDomainsApiLogic.mount();
  const domainManagementLogic = DomainManagementLogic({ indexName });
  const { domains, isLoading } = useValues(domainManagementLogic);

  if (isLoading) {
    return <Loading />;
  }

  return <>{JSON.stringify(domains)}</>;
};
