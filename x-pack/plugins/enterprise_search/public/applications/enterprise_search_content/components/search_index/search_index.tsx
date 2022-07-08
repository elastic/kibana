/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';

import { generateEncodedPath } from '../../../app_search/utils/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { FetchIndexApiLogic } from '../../api/index/fetch_index_api_logic';
import { SEARCH_INDEX_PATH, SEARCH_INDEX_TAB_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { baseBreadcrumbs } from '../search_indices';

import { ConnectorConfiguration } from './connector/connector_configuration';
import { ConnectorSchedulingComponent } from './connector/connector_scheduling';
import { SearchIndexDocuments } from './documents';
import { SearchIndexDomainManagement } from './domain_management';
import { SearchIndexIndexMappings } from './index_mappings';
import { SearchIndexOverview } from './overview';

export enum SearchIndexTabId {
  // all indices
  OVERVIEW = 'overview',
  DOCUMENTS = 'documents',
  INDEX_MAPPINGS = 'index_mappings',
  // connector indices
  CONFIGURATION = 'configuration',
  SCHEDULING = 'scheduling',
  // crawler indices
  DOMAIN_MANAGEMENT = 'domain_management',
}

export const SearchIndex: React.FC = () => {
  const { makeRequest, apiReset } = useActions(FetchIndexApiLogic);
  const { data: indexData, status: indexApiStatus } = useValues(FetchIndexApiLogic);
  const { indexName, tabId = SearchIndexTabId.OVERVIEW } = useParams<{
    indexName: string;
    tabId?: string;
  }>();

  useEffect(() => {
    makeRequest({ indexName });
    return apiReset;
  }, [indexName]);

  const ALL_INDICES_TABS: EuiTabbedContentTab[] = [
    {
      content: <SearchIndexOverview />,
      id: SearchIndexTabId.OVERVIEW,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
    },
    {
      content: <SearchIndexDocuments />,
      id: SearchIndexTabId.DOCUMENTS,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.documentsTabLabel', {
        defaultMessage: 'Documents',
      }),
    },
    {
      content: <SearchIndexIndexMappings />,
      id: SearchIndexTabId.INDEX_MAPPINGS,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.indexMappingsTabLabel', {
        defaultMessage: 'Index Mappings',
      }),
    },
  ];

  const CONNECTOR_TABS: EuiTabbedContentTab[] = [
    {
      content: <ConnectorConfiguration />,
      id: SearchIndexTabId.CONFIGURATION,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.configurationTabLabel', {
        defaultMessage: 'Configuration',
      }),
    },
    {
      content: <ConnectorSchedulingComponent />,
      id: SearchIndexTabId.SCHEDULING,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.schedulingTabLabel', {
        defaultMessage: 'Scheduling',
      }),
    },
  ];

  const CRAWLER_TABS: EuiTabbedContentTab[] = [
    {
      content: <SearchIndexDomainManagement />,
      id: SearchIndexTabId.DOMAIN_MANAGEMENT,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.domainManagementTabLabel', {
        defaultMessage: 'Manage Domains',
      }),
    },
  ];

  const tabs: EuiTabbedContentTab[] = [
    ...ALL_INDICES_TABS,
    ...(indexData?.connector ? CONNECTOR_TABS : []),
    ...(indexData?.crawler ? CRAWLER_TABS : []),
  ];

  const selectedTab = tabs.find((tab) => tab.id === tabId);

  const onTabClick = (tab: EuiTabbedContentTab) => {
    KibanaLogic.values.navigateToUrl(
      generateEncodedPath(
        tab.id === SearchIndexTabId.OVERVIEW ? SEARCH_INDEX_PATH : SEARCH_INDEX_TAB_PATH,
        {
          indexName,
          tabId: tab.id,
        }
      )
    );
  };

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName]}
      pageViewTelemetry={tabId}
      isLoading={indexApiStatus === Status.LOADING || indexApiStatus === Status.IDLE}
      pageHeader={{ pageTitle: indexName }}
    >
      <EuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
    </EnterpriseSearchContentPageTemplate>
  );
};
