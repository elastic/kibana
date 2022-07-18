/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues, useActions } from 'kea';

import useDebounce from 'react-use/lib/useDebounce';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiSwitch,
  EuiSearchBar,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { handlePageChange } from '../../../shared/table_pagination';
import { useLocalStorage } from '../../../shared/use_local_storage';
import { NEW_INDEX_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { IndicesLogic } from './indices_logic';
import { IndicesTable } from './indices_table';

import './search_indices.scss';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.content.breadcrumb', {
    defaultMessage: 'Content',
  }),
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.breadcrumb', {
    defaultMessage: 'Elasticsearch indices',
  }),
];

export const SearchIndices: React.FC = () => {
  const { makeRequest, onPaginate } = useActions(IndicesLogic);
  const { meta, indices, hasNoIndices, isLoading } = useValues(IndicesLogic);
  const [showHiddenIndices, setShowHiddenIndices] = useState(false);
  const [searchQuery, setSearchValue] = useState('');

  const [calloutDismissed, setCalloutDismissed] = useLocalStorage<boolean>(
    'enterprise-search-indices-callout-dismissed',
    false
  );

  useDebounce(
    () => makeRequest({ meta, returnHiddenIndices: showHiddenIndices, searchQuery }),
    150,
    [searchQuery, meta.page.current, showHiddenIndices]
  );

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

  const hiddenIndicesSwitch = (
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
  );

  const pageTitle =
    indices.length !== 0
      ? i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.pageTitle', {
          defaultMessage: 'Elasticsearch Indices',
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
        {!hasNoIndices ? (
          <EuiFlexGroup direction="column">
            {!calloutDismissed && (
              <EuiFlexItem>
                <EuiSpacer size="l" />
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
              </EuiFlexItem>
            )}
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
                    <EuiFlexItem grow={false}>{hiddenIndicesSwitch}</EuiFlexItem>
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
                          'xpack.idxMgmt.indexTable.systemIndicesSearchIndicesAriaLabel',
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
                isLoading={isLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <AddContentEmptyPrompt />
            <EuiSpacer size="xxl" />
            {engineSteps}
          </>
        )}
      </EnterpriseSearchContentPageTemplate>
      )
    </>
  );
};
