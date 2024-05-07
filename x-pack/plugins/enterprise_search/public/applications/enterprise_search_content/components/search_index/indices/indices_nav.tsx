/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams, useRouteMatch } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiSideNavItemType } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import { generateNavLink } from '../../../../shared/layout';
import { SEARCH_INDEX_PATH, SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { isConnectorIndex, isCrawlerIndex } from '../../../utils/indices';
import { IndexViewLogic } from '../index_view_logic';

import { SearchIndexTabId } from '../search_index';

export const useIndicesNav = () => {
  const isIndexRoute = !!useRouteMatch(SEARCH_INDEX_PATH);
  const { indexName } = useParams<{ indexName: string }>();

  const { hasFilteringFeature, index } = useValues(IndexViewLogic);
  const {
    productFeatures: { hasDefaultIngestPipeline },
  } = useValues(KibanaLogic);

  if (!indexName || !isIndexRoute) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      'data-test-subj': 'IndexLabel',
      id: 'indexName',
      name: indexName.toUpperCase(),
      ...generateNavLink({
        to: generateEncodedPath(SEARCH_INDEX_PATH, {
          indexName,
        }),
      }),
      items: [
        {
          'data-test-subj': 'IndexOverviewLink',
          id: 'overview',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.overviewTitle', {
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
          id: 'documents',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle.nav.documentsTitle', {
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
          id: 'index_mappings',
          name: i18n.translate(
            'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.indexMappingsTitle',
            {
              defaultMessage: 'Index mappings',
            }
          ),
          ...generateNavLink({
            to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
              indexName,
              tabId: SearchIndexTabId.INDEX_MAPPINGS,
            }),
          }),
        },
        ...(isConnectorIndex(index)
          ? [
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
                  to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                    indexName,
                    tabId: SearchIndexTabId.CONFIGURATION,
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
                        to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                          indexName,
                          tabId: SearchIndexTabId.SYNC_RULES,
                        }),
                      }),
                    },
                  ]
                : []),
              {
                'data-test-subj': 'IndexSchedulingLink',
                id: 'scheduling',
                name: i18n.translate(
                  'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.schedulingTitle',
                  {
                    defaultMessage: 'Scheduling',
                  }
                ),
                ...generateNavLink({
                  to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                    indexName,
                    tabId: SearchIndexTabId.SCHEDULING,
                  }),
                }),
              },
            ]
          : []),
        ...(isCrawlerIndex(index)
          ? [
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
                  shouldShowActiveForSubroutes: true,
                  to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                    indexName,
                    tabId: SearchIndexTabId.DOMAIN_MANAGEMENT,
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
                  to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                    indexName,
                    tabId: SearchIndexTabId.CRAWLER_CONFIGURATION,
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
                  to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                    indexName,
                    tabId: SearchIndexTabId.SCHEDULING,
                  }),
                }),
              },
            ]
          : []),
        ...(hasDefaultIngestPipeline
          ? [
              {
                'data-test-subj': 'IndexPipelineLink',
                id: 'pipelines',
                name: i18n.translate(
                  'xpack.enterpriseSearch.nav.searchIndicesTitle.nav.pipelinesLabel',
                  {
                    defaultMessage: 'Pipelines',
                  }
                ),
                ...generateNavLink({
                  to: generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                    indexName,
                    tabId: SearchIndexTabId.PIPELINES,
                  }),
                }),
              },
            ]
          : []),
      ],
    },
  ];

  return navItems;
};
