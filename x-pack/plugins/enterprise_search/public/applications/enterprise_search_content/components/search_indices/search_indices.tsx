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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  HorizontalAlignment,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';
import { EuiLinkTo, EuiButtonIconTo } from '../../../shared/react_router_helpers';

import { NEW_INDEX_PATH, SEARCH_INDEX_PATH } from '../../routes';
import { SearchIndex } from '../../types';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { SearchIndicesLogic } from './search_indices_logic';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.content.breadcrumb', {
    defaultMessage: 'Content',
  }),
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.breadcrumb', {
    defaultMessage: 'Search indices',
  }),
];

export const SearchIndices: React.FC = () => {
  const { initPage, searchEnginesLoadSuccess, searchIndicesLoadSuccess } =
    useActions(SearchIndicesLogic);
  const { searchIndices, searchEngines } = useValues(SearchIndicesLogic);

  useEffect(() => {
    initPage();
  }, []);

  // TODO This is for easy testing until we have the backend, please remove this before the release
  // @ts-ignore
  window.contentActions = {
    initPage,
    searchIndicesLoadSuccess,
    searchEnginesLoadSuccess,
  };

  // TODO: Replace with a real list of indices
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.name.columnTitle', {
        defaultMessage: 'Search index name',
      }),
      sortable: true,
      truncateText: true,
      render: (name: string, { indexSlug }: SearchIndex) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generatePath(SEARCH_INDEX_PATH, { indexSlug })}
        >
          {name}
        </EuiLinkTo>
      ),
    },
    {
      field: 'source_type',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.sourceType.columnTitle', {
        defaultMessage: 'Source type',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'elasticsearch_index_name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.elasticsearchIndexName.columnTitle',
        {
          defaultMessage: 'Elasticsearch index name',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'search_engines',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.searchEngines.columnTitle',
        {
          defaultMessage: 'Attached search engines',
        }
      ),
      truncateText: true,
    },
    {
      field: 'document_count',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.docsCount.columnTitle', {
        defaultMessage: 'Documents',
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
          render: ({ indexSlug }: SearchIndex) => (
            <EuiButtonIconTo
              iconType="eye"
              data-test-subj="view-search-index-button"
              to={generatePath(SEARCH_INDEX_PATH, { indexSlug })}
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
          <GettingStartedSteps step={searchIndices.length === 0 ? 'first' : 'second'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ElasticsearchResources />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const pageTitle =
    searchIndices.length !== 0
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
        {searchIndices.length !== 0 ? (
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
            <EuiBasicTable items={searchIndices} columns={columns} />
          </>
        ) : (
          <AddContentEmptyPrompt />
        )}
        <EuiSpacer size="xxl" />
        {(searchEngines.length === 0 || searchIndices.length === 0) && engineSteps}
      </EnterpriseSearchContentPageTemplate>
      )
    </>
  );
};
