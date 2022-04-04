/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchIndices } from '../../__mocks__';

import React from 'react';

import { generatePath } from 'react-router-dom';

import { EuiBasicTable, EuiButton, HorizontalAlignment } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiLinkTo, EuiButtonIconTo } from '../../../shared/react_router_helpers';

import { SEARCH_INDEX_OVERVIEW_PATH } from '../../routes';
import { SearchIndex } from '../../types';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const SearchIndices: React.FC = () => {
  // TODO: Replace with a real list of indices
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.searchIndices.name.columnTitle', {
        defaultMessage: 'Search index name',
      }),
      sortable: true,
      truncateText: true,
      render: (name: string, { indexSlug }: SearchIndex) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug })}
        >
          {name}
        </EuiLinkTo>
      ),
    },
    {
      field: 'source_type',
      name: i18n.translate('xpack.enterpriseSearch.searchIndices.sourceType.columnTitle', {
        defaultMessage: 'Source type',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'elasticsearch_index_name',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchIndices.elasticsearchIndexName.columnTitle',
        {
          defaultMessage: 'Elasticsearch index name',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'search_engines',
      name: i18n.translate('xpack.enterpriseSearch.searchIndices.searchEngines.columnTitle', {
        defaultMessage: 'Attached search engines',
      }),
      truncateText: true,
    },
    {
      field: 'document_count',
      name: i18n.translate('xpack.enterpriseSearch.searchIndices.docsCount.columnTitle', {
        defaultMessage: 'Documents',
      }),
      sortable: true,
      truncateText: true,
      align: 'right' as HorizontalAlignment,
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.searchIndices.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ indexSlug }: SearchIndex) => (
            <EuiButtonIconTo
              iconType="eye"
              data-test-subj="view-search-index-button"
              to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug })}
            />
          ),
        },
      ],
    },
  ];

  const createNewIndexButton = (
    <EuiLinkTo
      data-test-subj="create-new-index-button"
      to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug: 'new' })}
    >
      <EuiButton iconType="plusInCircle" color="primary" fill>
        {i18n.translate('xpack.enterpriseSearch.searchIndices.create.buttonTitle', {
          defaultMessage: 'Create new index',
        })}
      </EuiButton>
    </EuiLinkTo>
  );

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        i18n.translate('xpack.enterpriseSearch.searchIndices.content.breadcrumb', {
          defaultMessage: 'Content',
        }),
        i18n.translate('xpack.enterpriseSearch.searchIndices.searchIndices.breadcrumb', {
          defaultMessage: 'Search indices',
        }),
      ]}
      pageViewTelemetry="Search indices"
      isLoading={false}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.searchIndices.searchIndices.pageTitle', {
          defaultMessage: 'Search indices',
        }),
        rightSideItems: [createNewIndexButton],
      }}
    >
      <EuiBasicTable items={searchIndices} columns={columns} />
    </EnterpriseSearchContentPageTemplate>
  );
};
