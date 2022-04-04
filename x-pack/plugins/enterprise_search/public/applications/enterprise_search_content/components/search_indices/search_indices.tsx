/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchIndices } from '../../__mocks__';

import React from 'react';

import { generatePath } from 'react-router-dom';

import { EuiBasicTable, EuiButton, EuiButtonIcon, HorizontalAlignment } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../shared/react_router_helpers';

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
      // TypeScript does not like 'string' as a type for the 'name' render param. Not sure why.
      // The linter states it is looking for an 'IndexItem' type here. Falling back to it makes
      // the linter happy. We can revisit once we have an API and live data instead of the mock.
      render: (name: string | IndexItem) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug: 'foo123' })}
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
          render: () => (
            <EuiButtonIcon
              iconType="eye"
              data-test-subj="view-search-index-button"
              href={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug: 'foo123' })}
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
