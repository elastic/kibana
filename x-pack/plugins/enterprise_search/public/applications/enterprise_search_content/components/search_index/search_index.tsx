/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { SEARCH_INDEX_PATH } from '../../routes';

import { isCrawlerIndex } from '../../utils/indices';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { baseBreadcrumbs } from '../search_indices';

import { getHeaderActions } from './components/header_actions/header_actions';
import { ConnectorConfiguration } from './connector/connector_configuration';
import { ConnectorSchedulingComponent } from './connector/connector_scheduling';
import { ConnectorSyncRules } from './connector/sync_rules/connector_rules';
import { AutomaticCrawlScheduler } from './crawler/automatic_crawl_scheduler/automatic_crawl_scheduler';
import { CrawlCustomSettingsFlyout } from './crawler/crawl_custom_settings_flyout/crawl_custom_settings_flyout';
import { CrawlerConfiguration } from './crawler/crawler_configuration/crawler_configuration';
import { SearchIndexDomainManagement } from './crawler/domain_management/domain_management';
import { NoConnectorRecord } from './crawler/no_connector_record';
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
  CRAWLER_CONFIGURATION = 'crawler_configuration',
}

export const SearchIndex: React.FC = () => {
  const { index, isInitialLoading } = useValues(IndexViewLogic);

  const { tabId = SearchIndexTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const { indexName } = useValues(IndexNameLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);

  /**
   * Guided Onboarding needs us to mark the add data step as complete as soon as the user has data in an index.
   * This needs to be checked for any of the 3 registered search guideIds
   * Putting it here guarantees that if a user is viewing an index with data, it'll be marked as complete
   */
  const {
    config,
    guidedOnboarding,
    productAccess: { hasAppSearchAccess },
  } = useValues(KibanaLogic);

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('appSearch', 'add_data')
      .subscribe((isStepActive) => {
        if (isStepActive && index?.count) {
          guidedOnboarding?.guidedOnboardingApi?.completeGuideStep('appSearch', 'add_data');
        }
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding, index?.count]);

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('websiteSearch', 'add_data')
      .subscribe((isStepActive) => {
        if (isStepActive && index?.count) {
          guidedOnboarding?.guidedOnboardingApi?.completeGuideStep('websiteSearch', 'add_data');
        }
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding, index?.count]);

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

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName]}
      pageViewTelemetry={tabId}
      isLoading={isInitialLoading}
      pageHeader={{
        pageTitle: indexName,
        rightSideItems: getHeaderActions(index, hasAppSearchAccess),
      }}
    >
      {isCrawlerIndex(index) && !index.connector ? (
        <NoConnectorRecord />
      ) : isCrawlerIndex(index) && (Boolean(errorConnectingMessage) || !config.host) ? (
        <ErrorStatePrompt />
      ) : (
        <>
          {indexName === index?.name && (
            // <EuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
            <Routes>
              <Route
                exact
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.OVERVIEW}`}
                component={SearchIndexOverview}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.DOCUMENTS}`}
                component={SearchIndexDocuments}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.INDEX_MAPPINGS}`}
                component={SearchIndexIndexMappings}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.CONFIGURATION}`}
                component={ConnectorConfiguration}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.SYNC_RULES}`}
                component={ConnectorSyncRules}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.SCHEDULING}`}
                component={ConnectorSchedulingComponent}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.DOMAIN_MANAGEMENT}`}
                component={SearchIndexDomainManagement}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.CRAWLER_CONFIGURATION}`}
                component={CrawlerConfiguration}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.SCHEDULING}`}
                component={AutomaticCrawlScheduler}
              />
              <Route
                path={`${SEARCH_INDEX_PATH}/${SearchIndexTabId.PIPELINES}`}
                component={SearchIndexPipelines}
              />
              <Route path={`${SEARCH_INDEX_PATH}`} component={SearchIndexOverview} />
            </Routes>
          )}
          {isCrawlerIndex(index) && <CrawlCustomSettingsFlyout />}
        </>
      )}
    </EnterpriseSearchContentPageTemplate>
  );
};
