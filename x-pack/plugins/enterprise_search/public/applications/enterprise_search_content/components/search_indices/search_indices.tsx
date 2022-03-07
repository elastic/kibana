/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import { EuiBasicTable, EuiButton, EuiButtonIcon, EuiSpacer, EuiTitle } from '@elastic/eui';

import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { SEARCH_INDEX_OVERVIEW_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const SearchIndices: React.FC = () => {
  // TODO: Replace with a real list of indices
  const columns = [
    {
      field: 'name',
      name: 'Search index name',
      sortable: true,
      truncateText: true,
      render: (indexSlug: string) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug: 'foo123' })}
        >
          {indexSlug}
        </EuiLinkTo>
      ),
    },
    {
      field: 'source_type',
      name: 'Source type',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'elasticsearch_index_name',
      name: 'Elasticsearch index name',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'search_engines',
      name: 'Attached search engines',
      truncateText: true,
    },
    {
      field: 'docs.count',
      name: 'Documents',
      sortable: true,
      truncateText: true,
      align: 'right',
    },
    {
      name: 'Actions',
      actions: [
        {
          render: (indexSlug: string) => (
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

  const indices = [
    {
      name: 'Our API Index',
      indexSlug: 'index-1',
      source_type: 'API',
      elasticsearch_index_name: 'ent-search-api-one',
      search_engines: 'Search Engine One, Search Engine Two',
      docs: {
        count: 100,
      },
    },
    {
      name: 'Customer Feedback',
      indexSlug: 'index-2',
      source_type: 'Elasticsearch Index',
      elasticsearch_index_name: 'es-index-two',
      search_engines: 'Search Engine One',
      docs: {
        count: 100,
      },
    },
    {
      name: 'Dharma Crawler',
      indexSlug: 'index-3',
      source_type: 'Crawler',
      elasticsearch_index_name: 'ent-search-crawler-one',
      search_engines: 'Search Engine One, Search Engine Two',
      docs: {
        count: 100,
      },
    },
  ];

  const createNewIndexButton = (
    <EuiLinkTo
      data-test-subj="create-new-index-button"
      to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug: 'new' })}
    >
      <EuiButton iconType="plusInCircle" color="primary" fill>
        Create new index
      </EuiButton>
    </EuiLinkTo>
  );

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[]}
      pageViewTelemetry="Search indices"
      isLoading={false}
      pageHeader={{
        pageTitle: 'Search indices',
        rightSideItems: [createNewIndexButton],
      }}
    >
      <EuiBasicTable items={indices} columns={columns} />
    </EnterpriseSearchContentPageTemplate>
  );
};
