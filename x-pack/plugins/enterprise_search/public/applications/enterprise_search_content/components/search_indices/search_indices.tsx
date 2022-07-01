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
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  HorizontalAlignment,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';
import { EuiLinkTo, EuiButtonIconTo } from '../../../shared/react_router_helpers';
import { convertMetaToPagination, handlePageChange } from '../../../shared/table_pagination';
import { useLocalStorage } from '../../../shared/use_local_storage';
import { NEW_INDEX_PATH, SEARCH_INDEX_PATH } from '../../routes';
import { SearchIndex } from '../../types';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { IndicesLogic } from './indices_logic';

const healthColorsMap = {
  green: 'success',
  red: 'danger',
  unavailable: '',
  yellow: 'warning',
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
  const { makeRequest, onPaginate } = useActions(IndicesLogic);
  const { meta, indices, isLoading } = useValues(IndicesLogic);

  const [calloutDismissed, setCalloutDismissed] = useLocalStorage<boolean>(
    'enterprise-search-indices-callout-dismissed',
    false
  );

  useEffect(() => {
    makeRequest({ meta });
  }, [meta.page.current]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.name.columnTitle', {
        defaultMessage: 'Index name',
      }),
      render: (name: string) => (
        <EuiLinkTo
          data-test-subj="search-index-link"
          to={generatePath(SEARCH_INDEX_PATH, { indexName: name })}
        >
          {name}
        </EuiLinkTo>
      ),
      sortable: true,
      truncateText: true,
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
        defaultMessage: 'Index health',
      }),
      render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
        <span>
          <EuiIcon type="dot" color={healthColorsMap[health] ?? ''} />
          &nbsp;{health ?? '-'}
        </span>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'data_ingestion',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.dataIngestion.columnTitle',
        {
          defaultMessage: 'Data ingestion',
        }
      ),
      render: (dataIngestionStatus: string) =>
        dataIngestionStatus ? (
          <EuiBadge color={dataIngestionStatus === 'connected' ? 'success' : 'warning'}>
            {dataIngestionStatus}
          </EuiBadge>
        ) : null,
      truncateText: true,
    },
    {
      align: 'right' as HorizontalAlignment,
      field: 'total.store.size_in_bytes',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.storage.columnTitle', {
        defaultMessage: 'Storage',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      actions: [
        {
          render: ({ name }: SearchIndex) => (
            <EuiButtonIconTo
              aria-label={name}
              iconType="eye"
              data-test-subj="view-search-index-button"
              to={generatePath(SEARCH_INDEX_PATH, {
                indexName: name,
              })}
            />
          ),
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
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
        {indices.length !== 0 || isLoading ? (
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
            {!calloutDismissed && (
              <EuiCallOut
                size="m"
                title={i18n.translate('xpack.enterpriseSearch.content.callout.title', {
                  defaultMessage: 'Introducing Elasticsearch indices in Enterprise Search',
                })}
                iconType="iInCircle"
              >
                <p>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.indices.callout.text"
                    defaultMessage="Your Elasticsearch indices are now front and center in Enterprise Search. You can create new indices and build search experiences with them directly. To learn more about how to use Elasticsearch indices in Enterprise Search {docLink}"
                    values={{
                      docLink: (
                        <EuiLinkTo data-test-subj="search-index-link" to="#">
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.indices.callout.docLink',
                            {
                              defaultMessage: 'read the documentation',
                            }
                          )}
                        </EuiLinkTo>
                      ),
                    }}
                  />
                </p>
                <EuiButton fill onClick={() => setCalloutDismissed(true)}>
                  {i18n.translate('xpack.enterpriseSearch.content.callout.dismissButton', {
                    defaultMessage: 'Dismiss',
                  })}
                </EuiButton>
              </EuiCallOut>
            )}
            <EuiSpacer size="l" />
            <EuiBasicTable
              items={indices}
              columns={columns}
              onChange={handlePageChange(onPaginate)}
              pagination={{ ...convertMetaToPagination(meta), showPerPageOptions: false }}
              tableLayout="auto"
              loading={isLoading}
            />
          </>
        ) : (
          <AddContentEmptyPrompt />
        )}
        <EuiSpacer size="xxl" />
        {indices.length === 0 && !isLoading && engineSteps}
      </EnterpriseSearchContentPageTemplate>
      )
    </>
  );
};
