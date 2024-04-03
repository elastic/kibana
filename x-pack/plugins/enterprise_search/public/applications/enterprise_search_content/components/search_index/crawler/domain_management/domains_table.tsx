/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTableColumn, EuiBasicTable, EuiButtonIcon, EuiCopy } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedNumber } from '@kbn/i18n-react';

import { DELETE_BUTTON_LABEL, MANAGE_BUTTON_LABEL } from '../../../../../shared/constants';
import { CustomFormattedTimestamp } from '../../../../../shared/custom_formatted_timestamp/custom_formatted_timestamp';
import { generateEncodedPath } from '../../../../../shared/encode_path_params';

import { KibanaLogic } from '../../../../../shared/kibana';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../../../shared/table_pagination';
import { CrawlerDomain } from '../../../../api/crawler/types';
import { SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH } from '../../../../routes';
import { IndexNameLogic } from '../../index_name_logic';

import { DeleteDomainModalLogic } from './delete_domain_modal_logic';
import { DomainManagementLogic } from './domain_management_logic';

export const DomainsTable: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { domains, meta, isLoading } = useValues(DomainManagementLogic);
  const { onPaginate } = useActions(DomainManagementLogic);
  const { showModal } = useActions(DeleteDomainModalLogic);

  const columns: Array<EuiBasicTableColumn<CrawlerDomain>> = [
    {
      field: 'url',
      name: i18n.translate('xpack.enterpriseSearch.crawler.domainsTable.column.domainURL', {
        defaultMessage: 'Domain',
      }),
      render: (_, domain: CrawlerDomain) => (
        <>
          <EuiCopy textToCopy={domain.url}>
            {(copy) => <EuiButtonIcon onClick={copy} iconSize="s" iconType="copy" />}
          </EuiCopy>
          <EuiLinkTo
            data-test-subj="CrawlerDomainURL"
            to={generateEncodedPath(SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH, {
              domainId: domain.id,
              indexName,
              tabId: 'domain_management',
            })}
          >
            {domain.url}
          </EuiLinkTo>
        </>
      ),
    },
    {
      field: 'lastCrawl',
      name: i18n.translate('xpack.enterpriseSearch.crawler.domainsTable.column.lastActivity', {
        defaultMessage: 'Last activity',
      }),
      render: (lastCrawl: CrawlerDomain['lastCrawl']) =>
        lastCrawl ? <CustomFormattedTimestamp timestamp={lastCrawl} /> : '',
    },
    {
      field: 'documentCount',
      name: i18n.translate('xpack.enterpriseSearch.crawler.domainsTable.column.documents', {
        defaultMessage: 'Documents',
      }),
      render: (documentCount: CrawlerDomain['documentCount']) => (
        <FormattedNumber value={documentCount} />
      ),
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.crawler.domainsTable.column.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: MANAGE_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.crawler.domainsTable.action.manage.buttonLabel',
            {
              defaultMessage: 'Manage this domain',
            }
          ),
          type: 'icon',
          icon: 'eye',
          onClick: (domain) => {
            KibanaLogic.values.navigateToUrl(
              generateEncodedPath(SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH, {
                domainId: domain.id,
                indexName,
                tabId: 'domain_management',
              })
            );
          },
        },
        {
          name: DELETE_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.crawler.domainsTable.action.delete.buttonLabel',
            {
              defaultMessage: 'Delete this domain',
            }
          ),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (domain) => {
            showModal(domain);
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
