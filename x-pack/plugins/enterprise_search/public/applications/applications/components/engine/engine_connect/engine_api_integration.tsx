/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCodeBlock, EuiSpacer, EuiText, EuiTabs, EuiTab, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../shared/doc_links';
import { EngineViewLogic } from '../engine_view_logic';

import { EngineApiLogic } from './engine_api_logic';

import { elasticsearchUrl } from './search_application_api';

const SearchUISnippet = (esUrl: string, engineName: string, apiKey: string) => `
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

type TabId = 'apiRequest' | 'ruby' | 'python' | 'java' | 'javascript' | 'curl';
interface Tab {
  code: string;
  language: string;
  title: string;
}

export const EngineApiIntegrationStage: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState<TabId>('apiRequest');
  const { engineName } = useValues(EngineViewLogic);
  const { apiKey } = useValues(EngineApiLogic);
  const cloudContext = useCloudDetails();

  const Tabs: Record<TabId, Tab> = {
    apiRequest: {
      code: cURLSnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'bash',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step1.apiRequestTitle', {
        defaultMessage: 'API Request',
      }),
    },
    ruby: {
      code: SearchUISnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'ruby',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step2.rubyTitle', {
        defaultMessage: 'Ruby',
      }),
    },
    python: {
      code: SearchUISnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'python',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.pythonTitle', {
        defaultMessage: 'Python',
      }),
    },
    java: {
      code: SearchUISnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'java',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step4.javaTitle', {
        defaultMessage: 'Java',
      }),
    },
    javascript: {
      code: SearchUISnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'javascript',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step5.javascriptTitle', {
        defaultMessage: 'Javascript',
      }),
    },
    curl: {
      code: cURLSnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      language: 'bash',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step6.curlTitle', {
        defaultMessage: 'cURL',
      }),
    },
  };

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.content.engine.api.step3.intro"
            defaultMessage="Simplify your API calls by integrating one of our programming language clients. {clientsDocumentationLink}"
            values={{
              clientsDocumentationLink: (
                <EuiLink href={docLinks.clientsGuide}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.engine.safeSearchApi.step3.clientDocumenation',
                    {
                      defaultMessage: 'Learn more about clients.',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTabs>
        {Object.entries(Tabs).map(([tabId, tab]) => (
          <EuiTab
            key={tabId}
            isSelected={selectedTab === tabId}
            onClick={() => setSelectedTab(tabId as TabId)}
            data-telemetry-id={`entSearchApplications-api-integration-tab-${tabId}`}
          >
            {tab.title}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      <EuiText color="inherit">
        <h5>
          {i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.apiCall', {
            defaultMessage: 'API Call',
          })}
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock isCopyable lang={Tabs[selectedTab].language}>
        {Tabs[selectedTab].code}
      </EuiCodeBlock>
      <EuiSpacer size="l" />
      <EuiText color="inherit">
        <h5>
          {i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.apiRequestBody', {
            defaultMessage: 'API Request Body',
          })}
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock isCopyable lang={Tabs[selectedTab].language}>
        {Tabs[selectedTab].code}
      </EuiCodeBlock>
    </>
  );
};
