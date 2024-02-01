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

import { KibanaLogic } from '../../../shared/kibana';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { ConnectorConfiguration } from '../search_index/connector/connector_configuration';
import { ConnectorSchedulingComponent } from '../search_index/connector/connector_scheduling';
import { ConnectorSyncRules } from '../search_index/connector/sync_rules/connector_rules';
import { SearchIndexDocuments } from '../search_index/documents';
import { SearchIndexIndexMappings } from '../search_index/index_mappings';
import { baseBreadcrumbs } from '../search_indices';

import { ConnectorViewLogic } from './connector_view_logic';
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
  const { hasFilteringFeature, isLoading, index, connector } = useValues(ConnectorViewLogic);
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
      content: <ConnectorDetailOverview />,
      id: ConnectorDetailTabId.OVERVIEW,
      isSelected: selectedTabId === ConnectorDetailTabId.OVERVIEW,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.OVERVIEW),
    },
    {
      content: <SearchIndexDocuments />,
      disabled: !index,
      id: ConnectorDetailTabId.DOCUMENTS,
      isSelected: selectedTabId === ConnectorDetailTabId.DOCUMENTS,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.documentsTabLabel', {
        defaultMessage: 'Documents',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.DOCUMENTS),
    },
    {
      content: <SearchIndexIndexMappings />,
      disabled: !index,
      id: ConnectorDetailTabId.INDEX_MAPPINGS,
      isSelected: selectedTabId === ConnectorDetailTabId.INDEX_MAPPINGS,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.indexMappingsTabLabel', {
        defaultMessage: 'Index mappings',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.INDEX_MAPPINGS),
    },
  ];

  const CONNECTOR_TABS = [
    {
      content: <ConnectorConfiguration />,
      id: ConnectorDetailTabId.CONFIGURATION,
      isSelected: selectedTabId === ConnectorDetailTabId.CONFIGURATION,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.configurationTabLabel', {
        defaultMessage: 'Configuration',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.CONFIGURATION),
    },
    ...(hasFilteringFeature
      ? [
          {
            content: <ConnectorSyncRules />,
            disabled: !index,
            id: ConnectorDetailTabId.SYNC_RULES,
            isSelected: selectedTabId === ConnectorDetailTabId.SYNC_RULES,
            label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.syncRulesTabLabel', {
              defaultMessage: 'Sync rules',
            }),
            onClick: () => setSelectedTabId(ConnectorDetailTabId.SYNC_RULES),
          },
        ]
      : []),
    {
      content: <ConnectorSchedulingComponent />,
      disabled: !index,
      id: ConnectorDetailTabId.SCHEDULING,
      isSelected: selectedTabId === ConnectorDetailTabId.SCHEDULING,
      label: i18n.translate('xpack.enterpriseSearch.content.searchIndex.schedulingTabLabel', {
        defaultMessage: 'Scheduling',
      }),
      onClick: () => setSelectedTabId(ConnectorDetailTabId.SCHEDULING),
    },
  ];

  const PIPELINES_TAB = {
    content: <SearchIndexPipelines />,
    disabled: !index,
    id: ConnectorDetailTabId.PIPELINES,
    isSelected: selectedTabId === ConnectorDetailTabId.PIPELINES,
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
    ...(hasDefaultIngestPipeline ? [PIPELINES_TAB] : []),
  ];

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, connector?.name ?? '...']}
      pageViewTelemetry={tabId}
      isLoading={isLoading}
      pageHeader={{
        pageTitle: connector?.name ?? '...',
        rightSideItems: [], // getHeaderActions(index, hasAppSearchAccess),
        tabs,
      }}
    >
      {selectedTab?.content || null}
    </EnterpriseSearchContentPageTemplate>
  );
};
