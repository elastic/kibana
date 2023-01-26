/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import useObservable from 'react-use/lib/useObservable';

import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import {
  SEARCH_INDEX_PATH,
  SEARCH_INDEX_SELECT_CONNECTOR_PATH,
  SEARCH_INDEX_TAB_PATH,
} from '../../routes';

import { isConnectorIndex, isCrawlerIndex } from '../../utils/indices';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { baseBreadcrumbs } from '../search_indices';

import { getHeaderActions } from './components/header_actions/header_actions';
import { ConnectorConfiguration } from './connector/connector_configuration';
import { ConnectorSchedulingComponent } from './connector/connector_scheduling';
import { ConnectorSyncRules } from './connector/sync_rules/connector_rules';
import { AutomaticCrawlScheduler } from './crawler/automatic_crawl_scheduler/automatic_crawl_scheduler';
import { CrawlCustomSettingsFlyout } from './crawler/crawl_custom_settings_flyout/crawl_custom_settings_flyout';
import { SearchIndexDomainManagement } from './crawler/domain_management/domain_management';
import { SearchIndexDocuments } from './documents';
import { SearchIndexIndexMappings } from './index_mappings';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';
import { SearchIndexOverview } from './overview';
import { SearchIndexPipelines } from './pipelines/pipelines';

export enum SearchIndexTabId {
  // all indices
  OVERVIEW = 'overview',
  DOCUMENTS = 'documents',
  INDEX_MAPPINGS = 'index_mappings',
  PIPELINES = 'pipelines',
  // connector indices
  CONFIGURATION = 'configuration',
  SYNC_RULES = 'sync_rules',
  SCHEDULING = 'scheduling',
  // crawler indices
  DOMAIN_MANAGEMENT = 'domain_management',
}

export const SearchIndex: React.FC = () => {
  const { hasFilteringFeature, index, isInitialLoading } = useValues(IndexViewLogic);

  const { tabId = SearchIndexTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const { indexName } = useValues(IndexNameLogic);

  /**
   * Guided Onboarding needs us to mark the add data step as complete as soon as the user has data in an index
   * Putting it here guarantees that if a user is viewing an index with data, it'll be marked as complete
   */
  const { guidedOnboarding } = useValues(KibanaLogic);
  const isDataStepActive = useObservable(
    guidedOnboarding.guidedOnboardingApi!.isGuideStepActive$('search', 'add_data')
  );
  useEffect(() => {
    if (isDataStepActive && index?.count) {
      guidedOnboarding.guidedOnboardingApi?.completeGuideStep('search', 'add_data');
    }
  }, [isDataStepActive, index?.count]);

  useEffect(() => {
    if (
      isConnectorIndex(index) &&
      index.connector.is_native &&
      index.connector.service_type === null
    ) {
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_SELECT_CONNECTOR_PATH, { indexName })
      );
    }
  }, [index]);

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
        defaultMessage: 'Index mappings',
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
    ...(hasFilteringFeature
      ? [
          {
            content: <ConnectorSyncRules />,
            id: SearchIndexTabId.SYNC_RULES,
            name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.syncRulesTabLabel', {
              defaultMessage: 'Sync rules',
            }),
          },
        ]
      : []),
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
    {
      content: <AutomaticCrawlScheduler />,
      id: SearchIndexTabId.SCHEDULING,
      name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.schedulingTabLabel', {
        defaultMessage: 'Scheduling',
      }),
    },
  ];

  const PIPELINES_TAB: EuiTabbedContentTab = {
    content: <SearchIndexPipelines />,
    id: SearchIndexTabId.PIPELINES,
    name: i18n.translate('xpack.enterpriseSearch.content.searchIndex.pipelinesTabLabel', {
      defaultMessage: 'Pipelines',
    }),
  };

  const tabs: EuiTabbedContentTab[] = [
    ...ALL_INDICES_TABS,
    ...(isConnectorIndex(index) ? CONNECTOR_TABS : []),
    ...(isCrawlerIndex(index) ? CRAWLER_TABS : []),
    PIPELINES_TAB,
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
      isLoading={isInitialLoading}
      pageHeader={{
        pageTitle: indexName,
        rightSideItems: getHeaderActions(index),
      }}
    >
      <>
        {indexName === index?.name && (
          <EuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
        )}
        {isCrawlerIndex(index) && <CrawlCustomSettingsFlyout />}
      </>
    </EnterpriseSearchContentPageTemplate>
  );
};
