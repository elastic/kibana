/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams, useRouteMatch } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiSideNavItemType, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexViewLogic } from '../index_view_logic';
import {
  SEARCH_INDEX_CONNECTORS_CONFIGURATION_PATH,
  SEARCH_INDEX_CONNECTORS_SCHEDULING_PATH,
  SEARCH_INDEX_CONNECTORS_SYNC_RULES_PATH,
  SEARCH_INDEX_CRAWLER_CONFIGURATION_PATH,
  SEARCH_INDEX_CRAWLER_DOMAIN_MANAGEMENT_PATH,
  SEARCH_INDEX_CRAWLER_SCHEDULING_PATH,
  SEARCH_INDEX_DOCUMENTS_PATH,
  SEARCH_INDEX_INDEX_MAPPING_PATH,
  SEARCH_INDEX_PATH,
  SEARCH_INDEX_PIPELINES_PATH,
} from '../../../routes';
import { isConnectorIndex, isCrawlerIndex } from '../../../utils/indices';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import { generateNavLink } from '../../../../shared/layout';

import './indices_nav.scss';

export const useIndicesNav = () => {
  const isIndexRoute = !!useRouteMatch(SEARCH_INDEX_PATH);
  const { indexName } = useParams<{ indexName: string }>();

  const { hasFilteringFeature, index } = useValues(IndexViewLogic);
  const {
    productFeatures: { hasDefaultIngestPipeline },
  } = useValues(KibanaLogic);

  if (!indexName || !isIndexRoute) return undefined;

  const defaultNavItems: Array<EuiSideNavItemType<unknown>> = [
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
      id: 'overview',
      name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.overviewTitle', {
        defaultMessage: 'Overview',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_PATH, {
          indexName,
        }),
      }),
    },
    {
      'data-test-subj': 'IndexDocumentsLink',
      id: 'documents',
      name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.documentsTitle', {
        defaultMessage: 'Documents',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_DOCUMENTS_PATH, {
          indexName,
        }),
      }),
    },
    {
      'data-test-subj': 'IndexIndexMappingsLink',
      id: 'index_mappings',
      name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.indexMappingsTitle', {
        defaultMessage: 'Index mappings',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_INDEX_MAPPING_PATH, {
          indexName,
        }),
      }),
    },
  ];

  const connectorsNavItems: Array<EuiSideNavItemType<unknown>> = [
    {
      'data-test-subj': 'IndexConnectorsConfigurationLink',
      id: 'connectors_configuration',
      name: i18n.translate(
        'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.connectorsConfigurationLabel',
        {
          defaultMessage: 'Configuration',
        }
      ),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_CONNECTORS_CONFIGURATION_PATH, {
          indexName,
        }),
      }),
    },
    ...(hasFilteringFeature
      ? [
          {
            'data-test-subj': 'IndexSyncRulesLink',
            id: 'syncRules',
            name: i18n.translate(
              'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.syncRulesLabel',
              {
                defaultMessage: 'Sync rules',
              }
            ),
            ...generateNavLink({
              to: generateEncodedPath(SEARCH_INDEX_CONNECTORS_SYNC_RULES_PATH, {
                indexName,
              }),
            }),
          },
        ]
      : []),
    {
      'data-test-subj': 'IndexSchedulingLink',
      id: 'scheduling',
      name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.schedulingTitle', {
        defaultMessage: 'Scheduling',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_CONNECTORS_SCHEDULING_PATH, {
          indexName,
        }),
      }),
    },
  ];

  const crawlersNavItems: Array<EuiSideNavItemType<unknown>> = [
    {
      'data-test-subj': 'IndexDomainManagementLink',
      id: 'domain_management',
      name: i18n.translate(
        'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.domainManagementLabel',
        {
          defaultMessage: 'Manage Domains',
        }
      ),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_CRAWLER_DOMAIN_MANAGEMENT_PATH, {
          indexName,
        }),
      }),
    },
    {
      'data-test-subj': 'IndexCrawlerConfigurationLink',
      id: 'crawler_configuration',
      name: i18n.translate(
        'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.crawlerConfigurationLabel',
        {
          defaultMessage: 'Configuration',
        }
      ),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_CRAWLER_CONFIGURATION_PATH, {
          indexName,
        }),
      }),
    },
    {
      'data-test-subj': 'IndexCrawlerSchedulingLink',
      id: 'crawler_scheduling',
      name: i18n.translate(
        'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.crawlerSchedulingLabel',
        {
          defaultMessage: 'Scheduling',
        }
      ),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_CRAWLER_SCHEDULING_PATH, {
          indexName,
        }),
      }),
    },
  ];

  const pipelineNavItems: Array<EuiSideNavItemType<unknown>> = [
    {
      'data-test-subj': 'IndexPipelineLink',
      id: 'pipelines',
      name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.pipelinesLabel', {
        defaultMessage: 'Pipelines',
      }),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_PIPELINES_PATH, {
          indexName,
        }),
      }),
    },
  ];

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    ...defaultNavItems,
    ...(isConnectorIndex(index) ? connectorsNavItems : []),
    ...(isCrawlerIndex(index) ? crawlersNavItems : []),
    ...(hasDefaultIngestPipeline ? pipelineNavItems : []),
  ];

  return navItems;
};
