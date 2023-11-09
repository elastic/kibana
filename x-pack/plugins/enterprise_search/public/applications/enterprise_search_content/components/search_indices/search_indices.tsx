/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiSwitch,
  EuiSearchBar,
  EuiLink,
  EuiToolTip,
  EuiCode,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { docLinks } from '../../../shared/doc_links';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';
import { HttpLogic } from '../../../shared/http/http_logic';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiButtonTo, EuiLinkTo } from '../../../shared/react_router_helpers';
import { handlePageChange } from '../../../shared/table_pagination';
import { useLocalStorage } from '../../../shared/use_local_storage';
import { NEW_INDEX_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { CannotConnect } from '../search_index/components/cannot_connect';

import { DeleteIndexModal } from './delete_index_modal';
import { IndicesLogic } from './indices_logic';
import { IndicesStats } from './indices_stats';
import { IndicesTable } from './indices_table';

import './search_indices.scss';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.breadcrumb', {
    defaultMessage: 'Elasticsearch indices',
  }),
];

export const SearchIndices: React.FC = () => {
  const { fetchIndices, onPaginate, openDeleteModal, setIsFirstRequest } = useActions(IndicesLogic);
  const { meta, indices, hasNoIndices, isLoading, searchParams } = useValues(IndicesLogic);
  const [showHiddenIndices, setShowHiddenIndices] = useState(false);
  const [onlyShowSearchOptimizedIndices, setOnlyShowSearchOptimizedIndices] = useState(false);
  const [searchQuery, setSearchValue] = useState('');
  const { config } = useValues(KibanaLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);

  const [calloutDismissed, setCalloutDismissed] = useLocalStorage<boolean>(
    'enterprise-search-indices-callout-dismissed',
    false
  );

  useEffect(() => {
    // We don't want to trigger loading for each search query change, so we need this
    // flag to set if the call to backend is first request.
    setIsFirstRequest();
  }, []);

  useEffect(() => {
    fetchIndices({
      from: searchParams.from,
      onlyShowSearchOptimizedIndices,
      returnHiddenIndices: showHiddenIndices,
      searchQuery,
      size: searchParams.size,
    });
  }, [
    searchQuery,
    searchParams.from,
    searchParams.size,
    onlyShowSearchOptimizedIndices,
    showHiddenIndices,
  ]);

  const pageTitle = isLoading
    ? ''
    : hasNoIndices
    ? i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.emptyPageTitle', {
        defaultMessage: 'Welcome to Search',
      })
    : i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.pageTitle', {
        defaultMessage: 'Elasticsearch indices',
      });

  return (
    <>
      <DeleteIndexModal />
      <EnterpriseSearchContentPageTemplate
        pageChrome={baseBreadcrumbs}
        pageViewTelemetry="Search indices"
        isLoading={isLoading}
        pageHeader={{
          pageTitle,
          rightSideItems: isLoading
            ? []
            : [
                <EuiLinkTo data-test-subj="create-new-index-button" to={NEW_INDEX_PATH}>
                  <EuiButton
                    iconType="plusInCircle"
                    color="primary"
                    fill
                    data-test-subj="entSearchContent-searchIndices-createButton"
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.searchIndices.create.buttonTitle',
                      {
                        defaultMessage: 'Create a new index',
                      }
                    )}
                  </EuiButton>
                </EuiLinkTo>,
              ],
        }}
      >
        {config.host && config.canDeployEntSearch && errorConnectingMessage && (
          <>
            <CannotConnect />
            <EuiSpacer />
          </>
        )}
        {!config.host && config.canDeployEntSearch && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.enterpriseSearch.noEntSearchConfigured.title', {
                defaultMessage: 'Enterprise Search has not been configured',
              })}
              iconType="warning"
              color="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.noEntSearch.noCrawler"
                  defaultMessage="The Elastic web crawler is not available without Enterprise Search."
                />
              </p>
              <EuiButtonTo iconType="help" fill to="/setup_guide" color="warning">
                <FormattedMessage
                  id="xpack.enterpriseSearch.noEntSearch.setupGuideCta"
                  defaultMessage="Review setup guide"
                />
              </EuiButtonTo>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        {!hasNoIndices ? (
          <EuiFlexGroup direction="column">
            {!calloutDismissed && (
              <EuiFlexItem>
                <EuiSpacer size="l" />
                <EuiCallOut
                  size="m"
                  title={i18n.translate('xpack.enterpriseSearch.content.callout.title', {
                    defaultMessage: 'Introducing Elasticsearch indices in Search',
                  })}
                  iconType="iInCircle"
                >
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.content.indices.callout.text"
                      defaultMessage="Your Elasticsearch indices are now front and center in Search. You can create new indices and build search experiences with them directly. To learn more about how to use Elasticsearch indices in Search {docLink}"
                      values={{
                        docLink: (
                          <EuiLink
                            data-test-subj="search-index-link"
                            href={docLinks.appSearchElasticsearchIndexedEngines}
                            target="_blank"
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.content.indices.callout.docLink',
                              {
                                defaultMessage: 'read the documentation',
                              }
                            )}
                          </EuiLink>
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
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <IndicesStats />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle>
                    <h2>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchIndices.searchIndices.tableTitle',
                        {
                          defaultMessage: 'Available indices',
                        }
                      )}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        checked={showHiddenIndices}
                        label={i18n.translate(
                          'xpack.enterpriseSearch.content.searchIndices.searchIndices.includeHidden.label',
                          {
                            defaultMessage: 'Show hidden indices',
                          }
                        )}
                        onChange={(event) => setShowHiddenIndices(event.target.checked)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.searchIndices.searchIndices.onlySearchOptimized.tooltipContent"
                            defaultMessage="Search-optimized indices are prefixed with {code}. They are managed by ingestion mechanisms such as crawlers, connectors or ingestion APIs."
                            values={{ code: <EuiCode>search-</EuiCode> }}
                          />
                        }
                      >
                        <EuiSwitch
                          checked={onlyShowSearchOptimizedIndices}
                          label={i18n.translate(
                            'xpack.enterpriseSearch.content.searchIndices.searchIndices.onlySearchOptimized.label',
                            {
                              defaultMessage: 'Only show search-optimized indices',
                            }
                          )}
                          onChange={(event) =>
                            setOnlyShowSearchOptimizedIndices(event.target.checked)
                          }
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem className="entSearchIndicesSearchBar">
                      <EuiSearchBar
                        query={searchQuery}
                        box={{
                          incremental: true,
                          placeholder: i18n.translate(
                            'xpack.enterpriseSearch.content.searchIndices.searchIndices.searchBar.placeHolder',
                            {
                              defaultMessage: 'Filter Elasticsearch indices',
                            }
                          ),
                        }}
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.content.searchIndices.searchIndices.searchBar.ariaLabel',
                          {
                            defaultMessage: 'Filter Elasticsearch indices',
                          }
                        )}
                        onChange={(event) => setSearchValue(event.queryText)}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <IndicesTable
                indices={indices}
                meta={meta}
                onChange={handlePageChange(onPaginate)}
                onDelete={openDeleteModal}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <AddContentEmptyPrompt />
            <EuiSpacer size="xxl" />
            <>
              <EuiTitle data-test-subj="search-indices-empty-title">
                <h2>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.searchIndices.searchIndices.stepsTitle',
                    {
                      defaultMessage: 'Build beautiful search experiences with Search',
                    }
                  )}
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
          </>
        )}
      </EnterpriseSearchContentPageTemplate>
      )
    </>
  );
};
