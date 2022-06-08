/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: We need to write tests for this once we have a logic file in place and a functioning API.

import React from 'react';
import { useRouteMatch, useParams, generatePath } from 'react-router-dom';

import { EuiSideNavItemType, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateNavLink } from '../../../shared/layout';

import {
  INDEX_PATH,
  INDEX_OVERVIEW_PATH,
  INDEX_DOCUMENTS_PATH,
  INDEX_SCHEMA_PATH,
  INDEX_LOGS_PATH,
} from '../../routes';

import './index_nav.scss';

// TODO: replace once logic in place.
const indexName = 'Index name goes here';

export const useIndicesNav = () => {
  const isIndexRoute = !!useRouteMatch(INDEX_PATH);
  const { indexSlug } = useParams() as { indexSlug: string };

  if (!indexSlug || !isIndexRoute) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'indexName',
      name: indexName,
      renderItem: () => (
        <EuiText color="subdued" size="s" className="enterpriseSearchNavIndexLabel">
          <div className="eui-textTruncate">{indexName.toUpperCase()}</div>
        </EuiText>
      ),
      'data-test-subj': 'IndexLabel',
    },
    {
      id: 'overview',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.overviewTitle', {
        defaultMessage: 'Overview',
      }),
      ...generateNavLink({ to: generatePath(INDEX_OVERVIEW_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexOverviewLink',
    },
    {
      id: 'documents',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.documentsTitle', {
        defaultMessage: 'Documents',
      }),
      ...generateNavLink({ to: generatePath(INDEX_DOCUMENTS_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexDocumentsLink',
    },
    {
      id: 'schema',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.schemaTitle', {
        defaultMessage: 'Schema',
      }),
      ...generateNavLink({ to: generatePath(INDEX_SCHEMA_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexSchemaLink',
    },
    {
      id: 'logs',
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.nav.logsitle', {
        defaultMessage: 'Logs',
      }),
      ...generateNavLink({ to: generatePath(INDEX_LOGS_PATH, { indexSlug }) }),
      'data-test-subj': 'IndexLogsLink',
    },
  ];

  return navItems;
};
