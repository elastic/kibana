/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiSteps, EuiTab, EuiTabs } from '@elastic/eui';

import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { getEnterpriseSearchUrl } from '../../../../shared/enterprise_search_url';

import { EnterpriseSearchAnalyticsPageTemplate } from '../../layout/page_template';

import { javascriptClientEmbedSteps } from './analytics_collection_integrate_javascript_client_embed';
import { javascriptEmbedSteps } from './analytics_collection_integrate_javascript_embed';
import { searchUIEmbedSteps } from './analytics_collection_integrate_searchui';

interface AnalyticsCollectionIntegrateProps {
  analyticsCollection: AnalyticsCollection;
}

export type TabKey = 'javascriptEmbed' | 'searchuiEmbed' | 'javascriptClientEmbed';

export interface AnalyticsConfig {
  apiKey: string;
  collectionName: string;
  endpoint: string;
}

export const AnalyticsCollectionIntegrateView: React.FC<AnalyticsCollectionIntegrateProps> = ({
  analyticsCollection,
}) => {
  const [selectedTab, setSelectedTab] = React.useState<TabKey>('javascriptEmbed');

  const analyticsConfig: AnalyticsConfig = {
    apiKey: '########',
    collectionName: analyticsCollection?.name,
    endpoint: getEnterpriseSearchUrl(),
  };
  const webClientSrc = `https://cdn.jsdelivr.net/npm/@elastic/behavioral-analytics-browser-tracker@2/dist/umd/index.global.js`;

  const tabs: Array<{
    key: TabKey;
    title: string;
  }> = [
    {
      key: 'javascriptEmbed',
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptEmbed.title',
        {
          defaultMessage: 'Javascript Embed',
        }
      ),
    },
    {
      key: 'javascriptClientEmbed',
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.javascriptClientEmbed.title',
        {
          defaultMessage: 'Javascript Client',
        }
      ),
    },
    {
      key: 'searchuiEmbed',
      title: i18n.translate(
        'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.searchuiEmbed.title',
        {
          defaultMessage: 'Search UI',
        }
      ),
    },
  ];

  const steps: Record<TabKey, EuiContainedStepProps[]> = {
    javascriptClientEmbed: javascriptClientEmbedSteps(analyticsConfig),
    javascriptEmbed: javascriptEmbedSteps(webClientSrc, analyticsConfig),
    searchuiEmbed: searchUIEmbedSteps(setSelectedTab),
  };

  return (
    <EnterpriseSearchAnalyticsPageTemplate
      restrictWidth
      pageChrome={[analyticsCollection?.name]}
      analyticsName={analyticsCollection?.name}
      pageViewTelemetry={`View Analytics Collection - integrate`}
      pageHeader={{
        bottomBorder: false,
        pageTitle: i18n.translate(
          'xpack.enterpriseSearch.analytics.collectionsView.integration.title',
          {
            defaultMessage: 'Tracker Integration',
          }
        ),
        description: i18n.translate(
          'xpack.enterpriseSearch.analytics.collectionsView.integration.description',
          {
            defaultMessage:
              'Easily install our tracker on your search application to receive in depth analytics data. No search applications required.',
          }
        ),
        rightSideItems: [],
      }}
    >
      <>
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.key}
              onClick={() => {
                setSelectedTab(tab.key);
              }}
              isSelected={selectedTab === tab.key}
              data-test-subj={tab.key}
              data-telemetry-id={`entSearch-analytics-integrate-${tab.key}-tab`}
            >
              {tab.title}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="xxl" />
        <EuiSteps steps={steps[selectedTab]} />
      </>
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
