/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiBasicTableColumn, EuiBasicTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedNumber } from '@kbn/i18n-react';

import { DELETE_BUTTON_LABEL, MANAGE_BUTTON_LABEL } from '../../../../shared/constants';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';

import { CrawlerDomain } from '../../../api/crawler/types';

import { CustomFormattedTimestamp } from './custom_formatted_timestamp';
import { DomainManagementLogic } from './domain_management_logic';

const getDeleteDomainConfirmationMessage = (domainUrl: string) => {
  return i18n.translate(
    'xpack.enterpriseSearch.appSearch.crawler.action.deleteDomain.confirmationPopupMessage',
    {
      defaultMessage:
        'Are you sure you want to remove the domain "{domainUrl}" and all of its settings?',
      values: {
        domainUrl,
      },
    }
  );
};

export const DomainsTable: React.FC = () => {
  const { indexName } = useParams<{
    indexName: string;
  }>();

  const domainManagementLogic = DomainManagementLogic({ indexName });
  const { domains, meta, isLoading } = useValues(domainManagementLogic);
  const { onPaginate } = useActions(domainManagementLogic);

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
        <EuiLinkTo data-test-subj="CrawlerDomainURL" to={'' /* TODO */}>
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
    {
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
          onClick: () => {
            // KibanaLogic.values.navigateToUrl(
            //   generateEncodedPath(SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH, {
            //     indexName,
            //     domainId: domain.id,
            //   })
            // );
          },
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
              // deleteDomain(domain);
            }
          },
        },
      ],
    },
  ];

  return (
    <EuiBasicTable
      loading={isLoading}
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
