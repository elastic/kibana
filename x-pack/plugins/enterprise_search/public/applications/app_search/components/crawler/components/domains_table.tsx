/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTableColumn, EuiBasicTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedNumber } from '@kbn/i18n-react';

import { DELETE_BUTTON_LABEL, MANAGE_BUTTON_LABEL } from '../../../../shared/constants';
import { KibanaLogic } from '../../../../shared/kibana';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';
import { AppLogic } from '../../../app_logic';
import { ENGINE_CRAWLER_DOMAIN_PATH } from '../../../routes';
import { generateEnginePath } from '../../engine';
import { CrawlerDomainsLogic } from '../crawler_domains_logic';
import { CrawlerDomain } from '../types';

import { getDeleteDomainConfirmationMessage } from '../utils';

import { CustomFormattedTimestamp } from './custom_formatted_timestamp';

export const DomainsTable: React.FC = () => {
  const { domains, meta, dataLoading } = useValues(CrawlerDomainsLogic);
  const { fetchCrawlerDomainsData, onPaginate, deleteDomain } = useActions(CrawlerDomainsLogic);

  useEffect(() => {
    fetchCrawlerDomainsData();
  }, [meta.page.current]);

  const {
    myRole: { canManageEngineCrawler },
  } = useValues(AppLogic);

  const columns: Array<EuiBasicTableColumn<CrawlerDomain>> = [
    {
      field: 'url',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.domainsTable.column.domainURL',
        {
          defaultMessage: 'Domain URL',
        }
      ),
      render: (_, domain: CrawlerDomain) => (
        <EuiLinkTo
          data-test-subj="CrawlerDomainURL"
          to={generateEnginePath(ENGINE_CRAWLER_DOMAIN_PATH, { domainId: domain.id })}
        >
          {domain.url}
        </EuiLinkTo>
      ),
    },
    {
      field: 'lastCrawl',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.domainsTable.column.lastActivity',
        {
          defaultMessage: 'Last activity',
        }
      ),
      render: (lastCrawl: CrawlerDomain['lastCrawl']) =>
        lastCrawl ? <CustomFormattedTimestamp timestamp={lastCrawl} /> : '',
    },
    {
      field: 'documentCount',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.domainsTable.column.documents',
        {
          defaultMessage: 'Documents',
        }
      ),
      render: (documentCount: CrawlerDomain['documentCount']) => (
        <FormattedNumber value={documentCount} />
      ),
    },
  ];

  const actionsColumn: EuiBasicTableColumn<CrawlerDomain> = {
    name: i18n.translate('xpack.enterpriseSearch.appSearch.crawler.domainsTable.column.actions', {
      defaultMessage: 'Actions',
    }),
    actions: [
      {
        name: MANAGE_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.domainsTable.action.manage.buttonLabel',
          {
            defaultMessage: 'Manage this domain',
          }
        ),
        type: 'icon',
        icon: 'eye',
        onClick: (domain) =>
          KibanaLogic.values.navigateToUrl(
            generateEnginePath(ENGINE_CRAWLER_DOMAIN_PATH, { domainId: domain.id })
          ),
      },
      {
        name: DELETE_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.crawler.domainsTable.action.delete.buttonLabel',
          {
            defaultMessage: 'Delete this domain',
          }
        ),
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        onClick: (domain) => {
          if (window.confirm(getDeleteDomainConfirmationMessage(domain.url))) {
            deleteDomain(domain);
          }
        },
      },
    ],
  };

  if (canManageEngineCrawler) {
    columns.push(actionsColumn);
  }

  return (
    <EuiBasicTable
      loading={dataLoading}
      items={domains}
      columns={columns}
      pagination={{
        ...convertMetaToPagination(meta),
        showPerPageOptions: false,
      }}
      onChange={handlePageChange(onPaginate)}
    />
  );
};
