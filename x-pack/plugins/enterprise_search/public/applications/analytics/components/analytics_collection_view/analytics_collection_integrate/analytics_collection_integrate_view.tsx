/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiLink,
  EuiText,
  EuiCodeBlock,
} from '@elastic/eui';

import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';
import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../shared/doc_links';

import { KibanaLogic } from '../../../../shared/kibana';
import { EnterpriseSearchAnalyticsPageTemplate } from '../../layout/page_template';

import { javascriptClientEmbedSteps } from './analytics_collection_integrate_javascript_client_embed';
import { javascriptEmbedSteps } from './analytics_collection_integrate_javascript_embed';
import { searchUIEmbedSteps } from './analytics_collection_integrate_searchui';
import { GenerateAnalyticsApiKeyModal } from './api_key_modal/generate_analytics_api_key_modal';
import { GenerateApiKeyModalLogic } from './api_key_modal/generate_analytics_api_key_modal.logic';

interface AnalyticsCollectionIntegrateProps {
  analyticsCollection: AnalyticsCollection;
}

export type TabKey = 'javascriptEmbed' | 'searchuiEmbed' | 'javascriptClientEmbed';

export interface AnalyticsConfig {
  apiKey: string;
  collectionName: string;
  endpoint: string;
}

const CORSStep = (): EuiContainedStepProps => ({
  title: i18n.translate(
    'xpack.enterpriseSearch.analytics.collections.collectionsView.corsStep.title',
    {
      defaultMessage: 'Configure CORS',
    }
  ),
  children: (
    <>
      <EuiText>
        <>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.integration.corsStep.description',
              {
                defaultMessage:
                  "You must configure CORS to allow requests from your website's domain to the Analytics API endpoint. You can do this by adding the following to your Elasticsearch configuration file:",
              }
            )}
          </p>

          <EuiCodeBlock language="yaml" isCopyable>
            {`# http.cors.allow-origin: "https://my-website-domain.example"
http.cors.allow-origin: "*"
http.cors.enabled: true
http.cors.allow-credentials: true
http.cors.allow-methods: OPTIONS, POST
http.cors.allow-headers: X-Requested-With, X-Auth-Token, Content-Type, Content-Length, Authorization, Access-Control-Allow-Headers, Accept`}
          </EuiCodeBlock>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.integration.corsStep.descriptionTwo',
              {
                defaultMessage:
                  "Alternatively you can use a proxy server to route analytic requests from your website's domain to the Analytics API endpoint which will allow you to avoid configuring CORS.",
              }
            )}
          </p>
          <EuiLink
            href={docLinks.behavioralAnalyticsCORS}
            data-telemetry-id="entSearchContent-analytics-cors-learnMoreLink"
            external
            target="_blank"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.integration.corsStep.learnMoreLink',
              {
                defaultMessage: 'Learn more about CORS for Behavioral Analytics.',
              }
            )}
          </EuiLink>
        </>
      </EuiText>
    </>
  ),
});

const apiKeyStep = (
  openApiKeyModal: () => void,
  navigateToUrl: typeof KibanaLogic.values.navigateToUrl
): EuiContainedStepProps => ({
  title: i18n.translate(
    'xpack.enterpriseSearch.analytics.collections.collectionsView.apiKey.title',
    {
      defaultMessage: 'Create an API Key',
    }
  ),
  children: (
    <>
      <EuiText>
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.analytics.collectionsView.integration.apiKeyStep.apiKeyWarning',
            {
              defaultMessage:
                "Elastic does not store API keys. Once generated, you'll only be able to view the key one time. Make sure you save it somewhere secure. If you lose access to it you'll need to generate a new API key from this screen.",
            }
          )}{' '}
          <EuiLink
            href={docLinks.apiKeys}
            data-telemetry-id="entSearchContent-analytics-apiKey-learnMoreLink"
            external
            target="_blank"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.integration.apiKeyStep.learnMoreLink',
              {
                defaultMessage: 'Learn more about API keys.',
              }
            )}
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconSide="left"
            iconType="plusInCircleFilled"
            onClick={openApiKeyModal}
            data-telemetry-id="entSearchContent-analytics-apiKey-createApiKeyButton"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.integration.apiKeyStep.createAPIKeyButton',
              {
                defaultMessage: 'Create API Key',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconSide="left"
            iconType="popout"
            data-telemetry-id="entSearchContent-analytics-apiKey-viewKeysButton"
            onClick={() =>
              navigateToUrl('/app/management/security/api_keys', {
                shouldNotCreateHref: true,
              })
            }
          >
            {i18n.translate(
              'xpack.enterpriseSearch.analytics.collectionsView.integration.apiKeyStep.viewKeysButton',
              {
                defaultMessage: 'View Keys',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ),
});

export const AnalyticsCollectionIntegrateView: React.FC<AnalyticsCollectionIntegrateProps> = ({
  analyticsCollection,
}) => {
  const [selectedTab, setSelectedTab] = useState<TabKey>('javascriptEmbed');
  const [apiKeyModelOpen, setApiKeyModalOpen] = useState<boolean>(false);
  const { navigateToUrl } = useValues(KibanaLogic);
  const { apiKey } = useValues(GenerateApiKeyModalLogic);
  const DEFAULT_URL = 'https://localhost:9200';
  const cloudContext = useCloudDetails();

  const baseUrl = cloudContext.elasticsearchUrl || DEFAULT_URL;

  const analyticsConfig: AnalyticsConfig = {
    apiKey: apiKey || '########',
    collectionName: analyticsCollection?.name,
    endpoint: baseUrl,
  };
  const webClientSrc = `https://cdn.jsdelivr.net/npm/@elastic/behavioral-analytics-browser-tracker@2`;

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

  const apiKeyStepGuide = apiKeyStep(() => setApiKeyModalOpen(true), navigateToUrl);

  const steps: Record<TabKey, EuiContainedStepProps[]> = {
    javascriptClientEmbed: [
      apiKeyStepGuide,
      CORSStep(),
      ...javascriptClientEmbedSteps(analyticsConfig),
    ],
    javascriptEmbed: [
      apiKeyStepGuide,
      CORSStep(),
      ...javascriptEmbedSteps(webClientSrc, analyticsConfig),
    ],
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
              'Easily install our tracker on your application or website to receive in-depth analytics data.',
          }
        ),
        rightSideItems: [],
      }}
    >
      <>
        {apiKeyModelOpen ? (
          <GenerateAnalyticsApiKeyModal
            collectionName={analyticsCollection.name}
            onClose={() => {
              setApiKeyModalOpen(false);
            }}
          />
        ) : null}
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
