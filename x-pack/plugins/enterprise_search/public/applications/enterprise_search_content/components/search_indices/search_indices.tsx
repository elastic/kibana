/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { generatePath } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import {
  EuiBasicTable,
  EuiButton,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  HorizontalAlignment,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';
import { EuiLinkTo, EuiButtonIconTo } from '../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { IndicesLogic } from '../../logic/search_indices';
import { SEARCH_INDEX_OVERVIEW_PATH, NEW_INDEX_PATH } from '../../routes';
import { SearchIndex } from '../../types';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

const healthColorsMap = {
  red: 'danger',
  green: 'success',
  yellow: 'warning',
  unavailable: '',
};

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.content.breadcrumb', {
    defaultMessage: 'Content',
  }),
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.breadcrumb', {
    defaultMessage: 'Search indices',
  }),
];

export const SearchIndices: React.FC = () => {
  const { fetchSearchIndices, onPaginate } = useActions(IndicesLogic);
  const { indices, meta } = useValues(IndicesLogic);

  useEffect(() => {
    fetchSearchIndices();
  }, [meta.page.current]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.name.columnTitle', {
        defaultMessage: 'Index name',
      }),
      sortable: true,
      truncateText: true,
      render: (indexName: string) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, {
            indexSlug: encodeURIComponent(indexName),
          })}
        >
          {indexName}
        </EuiLinkTo>
      ),
    },
    {
      field: 'total.docs.count',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.docsCount.columnTitle', {
        defaultMessage: 'Docs count',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'health',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.health.columnTitle', {
        defaultMessage: 'Health',
      }),
      sortable: true,
      truncateText: true,
      render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
        <span>
          <EuiIcon type="dot" color={healthColorsMap[health] ?? ''} />
          &nbsp;{health ?? '-'}
        </span>
      ),
    },
    {
      field: 'data_ingestion',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.dataIngestion.columnTitle',
        {
          defaultMessage: 'Data ingestion',
        }
      ),
      truncateText: true,
      render: (dataIngestionStatus: string) =>
        dataIngestionStatus ? (
          <EuiBadge color={dataIngestionStatus === 'connected' ? 'success' : 'warning'}>
            {dataIngestionStatus}
          </EuiBadge>
        ) : null,
    },
    {
      field: 'total.store.size_in_bytes',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.storage.columnTitle', {
        defaultMessage: 'Storage',
      }),
      sortable: true,
      truncateText: true,
      align: 'right' as HorizontalAlignment,
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ name }: SearchIndex) => (
            <EuiButtonIconTo
              iconType="eye"
              data-test-subj="view-search-index-button"
              to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, {
                indexSlug: encodeURIComponent(name),
              })}
            />
          ),
        },
      ],
    },
  ];

  const createNewIndexButton = (
    <EuiLinkTo data-test-subj="create-new-index-button" to={NEW_INDEX_PATH}>
      <EuiButton iconType="plusInCircle" color="primary" fill>
        {i18n.translate('xpack.enterpriseSearch.content.searchIndices.create.buttonTitle', {
          defaultMessage: 'Create new index',
        })}
      </EuiButton>
    </EuiLinkTo>
  );

  const engineSteps = (
    <>
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.stepsTitle', {
            defaultMessage: 'Build beautiful search experiences with Enterprise Search',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <GettingStartedSteps step={indices.length === 0 ? 'first' : 'second'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ElasticsearchResources />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const pageTitle =
    indices.length !== 0
      ? i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.pageTitle', {
          defaultMessage: 'Content',
        })
      : i18n.translate(
          'xpack.enterpriseSearch.content.searchIndices.searchIndices.emptyPageTitle',
          {
            defaultMessage: 'Welcome to Enterprise Search',
          }
        );

  return (
    <>
      <EnterpriseSearchContentPageTemplate
        pageChrome={baseBreadcrumbs}
        pageViewTelemetry="Search indices"
        isLoading={false}
        pageHeader={{
          pageTitle,
          rightSideItems: [createNewIndexButton],
        }}
      >
        {indices.length !== 0 ? (
          <>
            <EuiTitle>
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndices.searchIndices.tableTitle',
                  {
                    defaultMessage: 'Search Indices',
                  }
                )}
              </h2>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiBasicTable
              items={indices}
              columns={columns}
              onChange={handlePageChange(onPaginate)}
              pagination={{ ...convertMetaToPagination(meta), showPerPageOptions: false }}
            />
          </>
        ) : (
          <AddContentEmptyPrompt />
        )}
        <EuiSpacer size="xxl" />
        {indices.length === 0 && engineSteps}
      </EnterpriseSearchContentPageTemplate>
      )
    </>
  );
};
