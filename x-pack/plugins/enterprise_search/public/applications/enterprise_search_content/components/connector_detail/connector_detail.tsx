/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

// import { generateEncodedPath } from '../../../shared/encode_path_params';
// import { ErrorStatePrompt } from '../../../shared/error_state';
// import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
// import { SEARCH_INDEX_PATH, SEARCH_INDEX_TAB_PATH } from '../../routes';

// import { isConnectorIndex /* isCrawlerIndex */ } from '../../utils/indices';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { baseBreadcrumbs } from '../search_indices';

// import { getHeaderActions } from './components/header_actions/header_actions';
import { ConnectorConfiguration } from './connector/connector_configuration';
import { ConnectorSchedulingComponent } from './connector/connector_scheduling';
import { ConnectorSyncRules } from './connector/sync_rules/connector_rules';
// import { CrawlCustomSettingsFlyout } from './crawler/crawl_custom_settings_flyout/crawl_custom_settings_flyout';
// import { AutomaticCrawlScheduler } from './crawler/automatic_crawl_scheduler/automatic_crawl_scheduler';
// import { CrawlerConfiguration } from './crawler/crawler_configuration/crawler_configuration';
// import { SearchIndexDomainManagement } from './crawler/domain_management/domain_management';
// import { NoConnectorRecord } from './crawler/no_connector_record';
import { ConnectorViewLogic } from './connector_view_logic';
import { SearchIndexDocuments } from './documents';
import { SearchIndexIndexMappings } from './index_mappings';
// import { IndexNameLogic } from './index_name_logic';
import { ConnectorDetailOverview } from './overview';
import { SearchIndexPipelines } from './pipelines/pipelines';

export enum ConnectorDetailTabId {
  // all indices
  OVERVIEW = 'overview',
  DOCUMENTS = 'documents',
  INDEX_MAPPINGS = 'index_mappings',
  PIPELINES = 'pipelines',
  // connector indices
  CONFIGURATION = 'configuration',
  SYNC_RULES = 'sync_rules',
  SCHEDULING = 'scheduling',
}

export const ConnectorDetail: React.FC = () => {
  const { hasFilteringFeature, isLoading, index } = useValues(ConnectorViewLogic);
  const { fetchConnector } = useActions(ConnectorViewLogic);
  useEffect(() => {
    fetchConnector({ connectorId: '6vzqVY0BeXPM5g_EQfu0' });
  }, []);

  const { tabId = ConnectorDetailTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const {
    productFeatures: { hasDefaultIngestPipeline },
  } = useValues(KibanaLogic);

  const [selectedTabId, setSelectedTabId] = useState<string>(tabId);
  const ALL_INDICES_TABS = [
    {
      isSelected: selectedTabId === ConnectorDetailTabId.OVERVIEW,
      content: <ConnectorDetailOverview />,
      id: ConnectorDetailTabId.OVERVIEW,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.OVERVIEW),
    },
    {
      isSelected: selectedTabId === ConnectorDetailTabId.DOCUMENTS,
      disabled: !index,
      content: <SearchIndexDocuments />,
      id: ConnectorDetailTabId.DOCUMENTS,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.documentsTabLabel', {
        defaultMessage: 'Documents',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.DOCUMENTS),
    },
    {
      isSelected: selectedTabId === ConnectorDetailTabId.INDEX_MAPPINGS,
      disabled: !index,
      content: <SearchIndexIndexMappings />,
      id: ConnectorDetailTabId.INDEX_MAPPINGS,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.indexMappingsTabLabel', {
        defaultMessage: 'Index mappings',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.INDEX_MAPPINGS),
    },
  ];

  const CONNECTOR_TABS = [
    {
      isSelected: selectedTabId === ConnectorDetailTabId.CONFIGURATION,
      content: <ConnectorConfiguration />,
      id: ConnectorDetailTabId.CONFIGURATION,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.configurationTabLabel', {
        defaultMessage: 'Configuration',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.CONFIGURATION),
    },
    ...(hasFilteringFeature
      ? [
          {
            isSelected: selectedTabId === ConnectorDetailTabId.SYNC_RULES,
            disabled: !index,
            content: <ConnectorSyncRules />,
            id: ConnectorDetailTabId.SYNC_RULES,
            label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.syncRulesTabLabel', {
              defaultMessage: 'Sync rules',
            }),
            onClick: () => setSelectedTabId(ConnectorDetailTabId.SYNC_RULES),
          },
        ]
      : []),
    {
      isSelected: selectedTabId === ConnectorDetailTabId.SCHEDULING,
      disabled: !index,
      content: <ConnectorSchedulingComponent />,
      id: ConnectorDetailTabId.SCHEDULING,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.schedulingTabLabel', {
        defaultMessage: 'Scheduling',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.SCHEDULING),
    },
  ];

  const PIPELINES_TAB = {
    isSelected: selectedTabId === ConnectorDetailTabId.PIPELINES,
    disabled: !index,
    content: <SearchIndexPipelines />,
    id: ConnectorDetailTabId.PIPELINES,
    label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.pipelinesTabLabel', {
      defaultMessage: 'Pipelines',
    }),
    onClick: () => setSelectedTabId(ConnectorDetailTabId.PIPELINES),
  };

  interface TabMenuItem {
    content: JSX.Element;
    disabled?: boolean;
    id: string;
    label: string;
    onClick?: () => void;
    prepend?: React.ReactNode;
    route?: string;
    testSubj?: string;
  }

  const tabs: TabMenuItem[] = [
    ...ALL_INDICES_TABS,
    ...CONNECTOR_TABS,
    // ...(isConnectorIndex(index) ? CONNECTOR_TABS : []),
    // ...(isCrawlerIndex(index) ? CRAWLER_TABS : []),
    ...(hasDefaultIngestPipeline ? [PIPELINES_TAB] : []),
  ];

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, 'TODO CHANGEME']}
      pageViewTelemetry={tabId}
      isLoading={isLoading}
      pageHeader={{
        tabs,
        pageTitle: 'CONNECTOR DETAIL CHANGEME',
        rightSideItems: [], // getHeaderActions(index, hasAppSearchAccess),
      }}
    >
      {selectedTab?.content || null}
    </EnterpriseSearchContentPageTemplate>
  );
};
