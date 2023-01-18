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

import { Loading } from '../../../../../shared/loading';

import { DeleteCrawlerDomainApiLogic } from '../../../../api/crawler/delete_crawler_domain_api_logic';
import { GetCrawlerDomainsApiLogic } from '../../../../api/crawler/get_crawler_domains_api_logic';

import { CrawlerDomainDetail } from '../crawler_domain_detail/crawler_domain_detail';

import { AddDomainFlyout } from './add_domain/add_domain_flyout';
import { CrawlerStatusBanner } from './crawler_status_banner';
import { DeleteDomainModal } from './delete_domain_modal';
import { DomainManagementLogic } from './domain_management_logic';
import { DomainsPanel } from './domains_panel';
import { EmptyStatePanel } from './empty_state_panel';

export const SearchIndexDomainManagement: React.FC = () => {
  DeleteCrawlerDomainApiLogic.mount();
  GetCrawlerDomainsApiLogic.mount();
  const { domains, isLoading } = useValues(DomainManagementLogic);

  const { detailId } = useParams<{
    detailId?: string;
  }>();

  if (isLoading) {
    return <Loading />;
  }

  return detailId ? (
    <CrawlerDomainDetail domainId={detailId} />
  ) : (
    <>
      <EuiSpacer />
      <CrawlerStatusBanner />
      {domains.length > 0 ? <DomainsPanel /> : <EmptyStatePanel />}
      <DeleteDomainModal />
      <AddDomainFlyout />
    </>
  );
};
