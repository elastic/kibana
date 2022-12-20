/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPanel, EuiSpacer, EuiSteps, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';

import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';
import { getEnterpriseSearchUrl } from '../../../../shared/enterprise_search_url';

import { javascriptClientEmbedSteps } from './analytics_collection_integrate_javascript_client_embed';
import { javascriptEmbedSteps } from './analytics_collection_integrate_javascript_embed';
import { searchUIEmbedSteps } from './analytics_collection_integrate_searchui';

interface AnalyticsCollectionIntegrateProps {
  collection: AnalyticsCollection;
}

export type TabKey = 'javascriptEmbed' | 'searchuiEmbed' | 'javascriptClientEmbed';

export const AnalyticsCollectionIntegrate: React.FC<AnalyticsCollectionIntegrateProps> = ({
  collection,
}) => {
  const analyticsDNSUrl = getEnterpriseSearchUrl(`/analytics/api/collections/${collection.id}`);
  const webClientSrc = getEnterpriseSearchUrl('/analytics.js');

  const [selectedTab, setSelectedTab] = React.useState<TabKey>('javascriptEmbed');

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
    javascriptClientEmbed: javascriptClientEmbedSteps(analyticsDNSUrl),
    javascriptEmbed: javascriptEmbedSteps(webClientSrc, analyticsDNSUrl),
    searchuiEmbed: searchUIEmbedSteps(setSelectedTab),
  };

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collections.collectionsView.integrateTab.title',
            {
              defaultMessage: 'Start tracking events',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
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
    </EuiPanel>
  );
};
