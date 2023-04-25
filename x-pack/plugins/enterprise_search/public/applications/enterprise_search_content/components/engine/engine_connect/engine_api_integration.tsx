/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCodeBlock, EuiSpacer, EuiText, EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { EngineViewLogic } from '../engine_view_logic';

import { EngineApiLogic } from './engine_api_logic';

import { elasticsearchUrl } from './search_application_api';

const SearchUISnippet = (esUrl: string, engineName: string, apiKey: string) => `6
import EnginesAPIConnector from "@elastic/search-ui-engines-connector";

const connector = new EnginesAPIConnector({
  host: "${esUrl}",
  engineName: "${engineName}",
  apiKey: "${apiKey || '<YOUR_API_KEY>'}"
});`;

const cURLSnippet = (esUrl: string, engineName: string, apiKey: string) => `
curl --location --request GET '${esUrl}/${engineName}/_search' \\
--header 'Authorization: apiKey ${apiKey || '<YOUR_API_KEY>'}' \\
--header 'Content-Type: application/json' \\
--data-raw '{
  "query": {
    "match_all": {}
  }
}'`;

type TabId = 'curl' | 'searchui';
interface Tab {
  code: string;
  language: string;
  title: string;
}

export const EngineApiIntegrationStage: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState<TabId>('curl');
  const { engineName } = useValues(EngineViewLogic);
  const { apiKey } = useValues(EngineApiLogic);
  const cloudContext = useCloudDetails();

  const Tabs: Record<TabId, Tab> = {
    curl: {
      code: cURLSnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'bash',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.curlTitle', {
        defaultMessage: 'cURL',
      }),
    },
    searchui: {
      code: SearchUISnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'javascript',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.searchUITitle', {
        defaultMessage: 'Search UI',
      }),
    },
  };

  return (
    <>
      <EuiText>
        <p>
          {i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.intro', {
            defaultMessage:
              'Learn how to integrate with your search application with the language clients maintained by Elastic to help build your search experience.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTabs>
        {Object.entries(Tabs).map(([tabId, tab]) => (
          <EuiTab
            key={tabId}
            isSelected={selectedTab === tabId}
            onClick={() => setSelectedTab(tabId as TabId)}
            data-telemetry-id={`entSearchContent-engines-api-integration-tab-${tabId}`}
          >
            {tab.title}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      <EuiCodeBlock isCopyable lang={Tabs[selectedTab].language}>
        {Tabs[selectedTab].code}
      </EuiCodeBlock>
    </>
  );
};
