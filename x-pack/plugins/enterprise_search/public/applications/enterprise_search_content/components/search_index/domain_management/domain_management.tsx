/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { Loading } from '../../../../shared/loading';

import { DeleteCrawlerDomainApiLogic } from '../../../api/crawler/delete_crawler_domain_api_logic';
import { GetCrawlerDomainsApiLogic } from '../../../api/crawler/get_crawler_domains_api_logic';

import { AddDomainFlyout } from './add_domain/add_domain_flyout';
import { DomainManagementLogic } from './domain_management_logic';
import { DomainsPanel } from './domains_panel';
import { EmptyStatePanel } from './empty_state_panel';

export const SearchIndexDomainManagement: React.FC = () => {
  const { indexName } = useParams<{
    indexName: string;
  }>();

  DeleteCrawlerDomainApiLogic.mount();
  GetCrawlerDomainsApiLogic.mount();
  const domainManagementLogic = DomainManagementLogic({ indexName });
  const { domains, isLoading } = useValues(domainManagementLogic);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <EuiSpacer />
      {domains.length > 0 ? <DomainsPanel /> : <EmptyStatePanel />}
      <AddDomainFlyout />
    </>
  );
};
