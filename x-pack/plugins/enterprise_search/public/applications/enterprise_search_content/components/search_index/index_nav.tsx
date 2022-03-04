/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useRouteMatch, useParams, generatePath } from 'react-router-dom';

import { EuiSideNavItemType, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateNavLink } from '../../../shared/layout';

import {
  SEARCH_INDEX_PATH,
  SEARCH_INDEX_OVERVIEW_PATH,
  SEARCH_INDEX_DOCUMENTS_PATH,
  SEARCH_INDEX_SCHEMA_PATH,
  SEARCH_INDEX_LOGS_PATH,
} from '../../routes';

// TODO: replace once logic in place.
const INDEX_NAME = 'Index name goes here';

export const useSearchIndicesNav = () => {
  const isIndexRoute = !!useRouteMatch(SEARCH_INDEX_PATH);
  const { indexSlug } = useParams() as { indexSlug: string };

  if (!indexSlug || !isIndexRoute) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'indexName',
      name: INDEX_NAME,
      renderItem: () => (
        <EuiText color="subdued" size="s" className="enterpriseSearchNavIndexLabel">
          <div className="eui-textTruncate">{INDEX_NAME.toUpperCase()}</div>
        </EuiText>
      ),
      'data-test-subj': 'IndexLabel',
    },
    {
      id: 'overview',
      name: i18n.translate('xpack.enterpriseSearch.searchIndex.nav.overviewTitle', {
        defaultMessage: 'Overview',
      }),
      ...generateNavLink({ to: generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexOverviewLink',
    },
    {
      id: 'documents',
      name: i18n.translate('xpack.enterpriseSearch.searchIndex.nav.documentsTitle', {
        defaultMessage: 'Documents',
      }),
      ...generateNavLink({ to: generatePath(SEARCH_INDEX_DOCUMENTS_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexDocumentsLink',
    },
    {
      id: 'schema',
      name: i18n.translate('xpack.enterpriseSearch.searchIndex.nav.schemaTitle', {
        defaultMessage: 'Schema',
      }),
      ...generateNavLink({ to: generatePath(SEARCH_INDEX_SCHEMA_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexSchemaLink',
    },
    {
      id: 'logs',
      name: i18n.translate('xpack.enterpriseSearch.searchIndex.nav.logsitle', {
        defaultMessage: 'Logs',
      }),
      ...generateNavLink({ to: generatePath(SEARCH_INDEX_LOGS_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexLogsLink',
    },
  ];

  return navItems;
};
