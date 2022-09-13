/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: We need to write tests for this once we have a logic file in place and a functioning API.

import React from 'react';
import { useRouteMatch, useParams } from 'react-router-dom';

import { EuiSideNavItemType, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { generateNavLink } from '../../../shared/layout';

import { SEARCH_INDEX_PATH, SEARCH_INDEX_TAB_PATH } from '../../routes';

import './index_nav.scss';
import { SearchIndexTabId } from './search_index';

export const useSearchIndicesNav = () => {
  const isIndexRoute = !!useRouteMatch(SEARCH_INDEX_PATH);
  const { indexName } = useParams<{ indexName: string }>();

  if (!indexName || !isIndexRoute) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      'data-test-subj': 'IndexLabel',
      id: 'indexName',
      name: indexName,
      renderItem: () => (
        <EuiText color="subdued" size="s" className="enterpriseSearchNavIndexLabel">
          <div className="eui-textTruncate">{indexName.toUpperCase()}</div>
        </EuiText>
      ),
    },
    {
      'data-test-subj': 'IndexOverviewLink',
      id: SearchIndexTabId.OVERVIEW,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.overviewTitle', {
        defaultMessage: 'Overview',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.OVERVIEW,
        }),
      }),
    },
    {
      'data-test-subj': 'IndexDocumentsLink',
      id: SearchIndexTabId.DOCUMENTS,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.documentsTitle', {
        defaultMessage: 'Documents',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.DOCUMENTS,
        }),
      }),
    },
    {
      'data-test-subj': 'IndexIndexMappingsLink',
      id: SearchIndexTabId.INDEX_MAPPINGS,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.indexMappingsTitle', {
        defaultMessage: 'Index Mappings',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.INDEX_MAPPINGS,
        }),
      }),
    },
  ];

  return navItems;
};
