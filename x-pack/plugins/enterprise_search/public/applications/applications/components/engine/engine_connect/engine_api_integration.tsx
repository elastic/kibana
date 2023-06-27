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
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../shared/doc_links';
import { KibanaLogic } from '../../../../shared/kibana';
import { EngineViewLogic } from '../engine_view_logic';

import { EngineApiLogic } from './engine_api_logic';

import { elasticsearchUrl } from './search_application_api';

const clientSnippet = (esUrl: string, searchApplicationName: string, apiKey: string) => `
import Client from '@elastic/search-application-client'
// or through CDN
// const Client = window['SearchApplicationClient']

const request = Client(
  ${searchApplicationName},
  ${esUrl},
  ${apiKey || '<YOUR_API_KEY>'},
)

const results = await request()
  .query('pizza')
  .addParameter('myCustomParameter', 'example value')
  .search()
`;

const cURLSnippet = (
  esUrl: string,
  searchApplicationName: string,
  apiKey: string,
  params: unknown
) => `
curl --location --request POST '${esUrl}/_application/search_application/${searchApplicationName}/_search' \\
--header 'Authorization: apiKey ${apiKey || '<YOUR_API_KEY>'}' \\
--header 'Content-Type: application/json' \\
--data-raw '${JSON.stringify({ params }, null, 2)}'`;

const apiRequestSnippet = (searchApplicationName: string, params: unknown) => {
  const body = JSON.stringify({ params }, null, 2);
  return `
POST /_application/search_application/${searchApplicationName}/_search
${body}
`;
};

const consoleRequest = (searchApplicationName: string, params: unknown) =>
  `POST /_application/search_application/${searchApplicationName}/_search
${JSON.stringify({ params }, null, 2)}`;

type TabId = 'apirequest' | 'client' | 'curl';

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
  const { engineName } = useValues(EngineViewLogic);
  const { apiKey } = useValues(EngineApiLogic);
  const cloudContext = useCloudDetails();

  const params = { query: 'pizza', myCustomParameter: 'example value' };
  const Tabs: Record<TabId, Tab> = {
    apirequest: {
      code: apiRequestSnippet(engineName, params),
      copy: false,
      language: 'http',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.tab.apirequestTitle',
        {
          defaultMessage: 'API Request',
        }
      ),
    },
    client: {
      code: clientSnippet(elasticsearchUrl(cloudContext), engineName, apiKey),
      copy: true,
      language: 'javascript',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.tab.clientTitle',
        {
          defaultMessage: 'Javascript Client',
        }
      ),
    },
    curl: {
      code: cURLSnippet(elasticsearchUrl(cloudContext), engineName, apiKey, params),
      copy: true,
      language: 'bash',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.tab.curlTitle',
        {
          defaultMessage: 'cURL',
        }
      ),
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
          <FormattedMessage
            id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.description"
            defaultMessage="Simplify your API calls by using one of our {clientsDocumentationLink}."
            values={{
              clientsDocumentationLink: (
                <EuiLink href={docLinks.clientsGuide}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.clientsDocumenation',
                    {
                      defaultMessage: 'programming language clients',
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
            data-telemetry-id={`entSearchApplications-safeSearchApi-integration-tab-${tabId}`}
          >
            {tab.title}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      {selectedTab === 'client' && (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText>
              <h5>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.installationTitle',
                  {
                    defaultMessage: 'Installation',
                  }
                )}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="inherit">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.npmInstallDescription',
                  {
                    defaultMessage:
                      'Search application client is accessible from NPM package registry',
                  }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiCodeBlock isCopyable lang="bash">
              {`npm install @elastic/search-application-client`}
            </EuiCodeBlock>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText color="inherit">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.cdnInstallDescription',
                  {
                    defaultMessage: 'or via CDN',
                  }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiCodeBlock isCopyable lang="html">
              {`<script src="https://cdn.jsdelivr.net/npm/@elastic/search-application-client@latest"></script>`}
            </EuiCodeBlock>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiText color="inherit">
              <h5>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.clientUsageTitle',
                  {
                    defaultMessage: 'Usage',
                  }
                )}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.clientUsageDescription"
                defaultMessage="To get the most out of the client, use the javascript client's example template and follow our {searchapplicationClientDocLink} on building a search experience."
                values={{
                  searchapplicationClientDocLink: (
                    // replace # with search application client doc link
                    <EuiLink href="#">
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step3.clientDocumenation',
                        {
                          defaultMessage: 'how to guide',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiCodeBlock isCopyable={Tabs[selectedTab].copy} language={Tabs[selectedTab].language}>
        {Tabs[selectedTab].code}
      </EuiCodeBlock>
      {selectedTab === 'apirequest' && consolePreviewLink && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" alignItems="flexEnd">
            <EuiLink href={consolePreviewLink} target="_blank">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.searchApplication.safeSearchApi.step4.apiRequestConsoleButton"
                defaultMessage="Try in console"
              />
            </EuiLink>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
