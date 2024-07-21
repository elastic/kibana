/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../routes';
import { connectorsBreadcrumbs } from '../connectors/connectors';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { ConnectorScheduling } from '../search_index/connector/connector_scheduling';
import { ConnectorSyncRules } from '../search_index/connector/sync_rules/connector_rules';
import { SearchIndexDocuments } from '../search_index/documents';
import { SearchIndexIndexMappings } from '../search_index/index_mappings';
import { SearchIndexPipelines } from '../search_index/pipelines/pipelines';
import { getHeaderActions } from '../shared/header_actions/header_actions';

import { ConnectorConfiguration } from './connector_configuration';
import { ConnectorNameAndDescription } from './connector_name_and_description';
import { ConnectorViewLogic } from './connector_view_logic';
import { ConnectorDetailOverview } from './overview';

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
  const connectorId = decodeURIComponent(useParams<{ connectorId: string }>().connectorId);
  const { hasFilteringFeature, isLoading, index, connector } = useValues(ConnectorViewLogic);
  const { fetchConnectorApiReset, startConnectorPoll, stopConnectorPoll } =
    useActions(ConnectorViewLogic);
  useEffect(() => {
    stopConnectorPoll();
    fetchConnectorApiReset();
    startConnectorPoll(connectorId);
  }, [connectorId]);

  const { tabId = ConnectorDetailTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const {
    guidedOnboarding,
    productFeatures: { hasDefaultIngestPipeline },
  } = useValues(KibanaLogic);

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('databaseSearch', 'add_data')
      .subscribe((isStepActive) => {
        if (isStepActive && index?.count) {
          guidedOnboarding.guidedOnboardingApi?.completeGuideStep('databaseSearch', 'add_data');
        }
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding, index?.count]);

  const ALL_INDICES_TABS = [
    {
      content: <ConnectorDetailOverview />,
      id: ConnectorDetailTabId.OVERVIEW,
      isSelected: tabId === ConnectorDetailTabId.OVERVIEW,
      label: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorDetail.overviewTabLabel',
        {
          defaultMessage: 'Overview',
        }
      ),
      onClick: () =>
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
            connectorId,
            tabId: ConnectorDetailTabId.OVERVIEW,
          })
        ),
    },
    {
      content: <SearchIndexDocuments />,
      disabled: !index,
      id: ConnectorDetailTabId.DOCUMENTS,
      isSelected: tabId === ConnectorDetailTabId.DOCUMENTS,
      label: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorDetail.documentsTabLabel',
        {
          defaultMessage: 'Documents',
        }
      ),
      onClick: () =>
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
            connectorId,
            tabId: ConnectorDetailTabId.DOCUMENTS,
          })
        ),
    },
    {
      content: <SearchIndexIndexMappings />,
      disabled: !index,
      id: ConnectorDetailTabId.INDEX_MAPPINGS,
      isSelected: tabId === ConnectorDetailTabId.INDEX_MAPPINGS,
      label: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorDetail.indexMappingsTabLabel',
        {
          defaultMessage: 'Index mappings',
        }
      ),
      onClick: () =>
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
            connectorId,
            tabId: ConnectorDetailTabId.INDEX_MAPPINGS,
          })
        ),
    },
  ];

  const CONNECTOR_TABS = [
    ...(hasFilteringFeature
      ? [
          {
            content: <ConnectorSyncRules />,
            disabled: !index,
            id: ConnectorDetailTabId.SYNC_RULES,
            isSelected: tabId === ConnectorDetailTabId.SYNC_RULES,
            label: i18n.translate(
              'xpack.enterpriseSearch.content.connectors.connectorDetail.syncRulesTabLabel',
              {
                defaultMessage: 'Sync rules',
              }
            ),
            onClick: () =>
              KibanaLogic.values.navigateToUrl(
                generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                  connectorId,
                  tabId: ConnectorDetailTabId.SYNC_RULES,
                })
              ),
          },
        ]
      : []),
    {
      content: <ConnectorScheduling />,
      disabled: !connector?.index_name,
      id: ConnectorDetailTabId.SCHEDULING,
      isSelected: tabId === ConnectorDetailTabId.SCHEDULING,
      label: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorDetail.schedulingTabLabel',
        {
          defaultMessage: 'Scheduling',
        }
      ),
      onClick: () =>
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
            connectorId,
            tabId: ConnectorDetailTabId.SCHEDULING,
          })
        ),
    },
  ];

  const CONFIG_TAB = [
    {
      content: <ConnectorConfiguration />,
      id: ConnectorDetailTabId.CONFIGURATION,
      isSelected: tabId === ConnectorDetailTabId.CONFIGURATION,
      label: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorDetail.configurationTabLabel',
        {
          defaultMessage: 'Configuration',
        }
      ),
      onClick: () =>
        KibanaLogic.values.navigateToUrl(
          generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
            connectorId,
            tabId: ConnectorDetailTabId.CONFIGURATION,
          })
        ),
    },
  ];

  const PIPELINES_TAB = {
    content: <SearchIndexPipelines />,
    disabled: !index,
    id: ConnectorDetailTabId.PIPELINES,
    isSelected: tabId === ConnectorDetailTabId.PIPELINES,
    label: i18n.translate(
      'xpack.enterpriseSearch.content.connectors.connectorDetail.pipelinesTabLabel',
      {
        defaultMessage: 'Pipelines',
      }
    ),
    onClick: () =>
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
          connectorId,
          tabId: ConnectorDetailTabId.PIPELINES,
        })
      ),
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
    ...CONFIG_TAB,
  ];

  const selectedTab = tabs.find((tab) => tab.id === tabId);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...connectorsBreadcrumbs, connector?.name ?? '...']}
      pageViewTelemetry={tabId}
      isLoading={isLoading}
      pageHeader={{
        pageTitle: connector ? <ConnectorNameAndDescription connector={connector} /> : '...',
        rightSideGroupProps: {
          gutterSize: 's',
          responsive: false,
          wrap: false,
        },
        rightSideItems: getHeaderActions(index, connector),
        tabs,
      }}
    >
      {selectedTab?.content || null}
    </EnterpriseSearchContentPageTemplate>
  );
};
