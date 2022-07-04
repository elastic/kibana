/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiPanel, EuiIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Loading } from '../../../../shared/loading';

import { DeleteCrawlerDomainApiLogic } from '../../../api/crawler/delete_crawler_domain_api_logic';
import { GetCrawlerDomainsApiLogic } from '../../../api/crawler/get_crawler_domains_api_logic';

import { AddDomainFlyout } from './add_domain/add_domain_flyout';
import { DomainManagementLogic } from './domain_management_logic';
import { DomainsTable } from './domains_table';

export const SearchIndexDomainManagement: React.FC = () => {
  const { indexName } = useParams<{
    indexName: string;
  }>();

  DeleteCrawlerDomainApiLogic.mount();
  GetCrawlerDomainsApiLogic.mount();
  const domainManagementLogic = DomainManagementLogic({ indexName });
  const { isLoading } = useValues(domainManagementLogic);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <EuiSpacer />
      <EuiPanel>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="globe" />
          </EuiFlexItem>
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
      </EuiPanel>
    </>
  );
};
