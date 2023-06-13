/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import { compressToEncodedURIComponent } from 'lz-string';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiLink,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { KibanaLogic } from '../../../../shared/kibana';
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

const cURLSnippet = (esUrl: string, engineName: string, apiKey: string, params: unknown) => `
curl --location --request POST '${esUrl}/_application/search_application/${engineName}/_search' \\
--header 'Authorization: apiKey ${apiKey || '<YOUR_API_KEY>'}' \\
--header 'Content-Type: application/json' \\
--data-raw '${JSON.stringify({ params }, null, 2)}'`;

const apiRequestSnippet = (
  esUrl: string,
  searchApplicationName: string,
  apiKey: string,
  params: unknown
) => {
  const body = JSON.stringify({ params }, null, 2);
  return `
POST /_application/search_application/${searchApplicationName}/_search HTTP/1.1
Accept: application/json
Authorization: apiKey ${apiKey || '<YOUR_API_KEY>'}
Content-Length: ${body.length}
Content-Type: application/json
Host: ${new URL(esUrl).host}
${body}
`;
};

const consoleRequest = (searchApplicationName: string, params: unknown) =>
  `POST /_application/search_application/${searchApplicationName}/_search
${JSON.stringify({ params }, null, 2)}`;

type TabId = 'curl' | 'searchui' | 'apirequest';
interface Tab {
  code: string;
  copy: boolean;
  language: string;
  title: string;
}

export const EngineApiIntegrationStage: React.FC = () => {
  const {
    application,
    share: { url },
  } = useValues(KibanaLogic);
  const [selectedTab, setSelectedTab] = React.useState<TabId>('apirequest');
  const { engineName, engineData } = useValues(EngineViewLogic);
  const { apiKey } = useValues(EngineApiLogic);
  const cloudContext = useCloudDetails();

  const params = engineData?.template.script.params ?? {};

  const Tabs: Record<TabId, Tab> = {
    apirequest: {
      code: apiRequestSnippet(elasticsearchUrl(cloudContext), engineName, apiKey, params),
      copy: false,
      language: 'http',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.apiRequestTitle', {
        defaultMessage: 'API Request',
      }),
    },
    curl: {
      code: cURLSnippet(elasticsearchUrl(cloudContext), engineName, apiKey, params),
      copy: true,
      language: 'bash',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.curlTitle', {
        defaultMessage: 'cURL',
      }),
    },
    searchui: {
      code: SearchUISnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      copy: true,
      language: 'javascript',
      title: i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.searchUITitle', {
        defaultMessage: 'Search UI',
      }),
    },
  };

  const canShowDevtools = !!application?.capabilities?.dev_tools?.show;
  const consolePreviewLink = canShowDevtools
    ? url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl(
        {
          loadFrom: `data:text/plain,${compressToEncodedURIComponent(
            consoleRequest(engineName, params)
          )}`,
        },
        undefined,
        []
      )
    : null;

  return (
    <>
      <EuiText>
        <p>
          {i18n.translate('xpack.enterpriseSearch.content.engine.api.step3.intro', {
            defaultMessage:
              'Use the following code snippets to connect to your search application.',
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
            data-telemetry-id={`entSearchApplications-api-integration-tab-${tabId}`}
          >
            {tab.title}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      <EuiCodeBlock isCopyable={Tabs[selectedTab].copy} language={Tabs[selectedTab].language}>
        {Tabs[selectedTab].code}
      </EuiCodeBlock>
      {selectedTab === 'apirequest' && consolePreviewLink && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" alignItems="flexEnd">
            <EuiLink href={consolePreviewLink} target="_blank">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.api.step3.apiRequestConsoleButton"
                defaultMessage="Try in console"
              />
            </EuiLink>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
