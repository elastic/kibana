/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SelectClientPanel,
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
  LanguageClientPanel,
  InstallClientPanel,
  OverviewPanel,
  getLanguageDefinitionCodeSnippet,
  getConsoleRequest,
  CloudDetailsPanel,
} from '@kbn/search-api-panels';

import { ApiKey } from '@kbn/security-plugin/common';

import { PLUGIN_ID } from '../../../../common/constants';
import { KibanaDeps } from '../../../../common/types';

import { icons } from '../../../assets/client_libraries';
import { docLinks } from '../doc_links';

import { HttpLogic } from '../http';

import { curlDefinition } from './languages/curl';
import { languageDefinitions } from './languages/languages';
import { AddDataPanelContent } from './panels/add_data_panel_content';
import { ApiKeyPanelContent } from './panels/api_key_panel_content';
import { InitializeClientPanelContent } from './panels/initialize_client_panel_content';
import { GettingStartedPipelinePanel } from './panels/pipeline_panel';
import { SearchQueryPanelContent } from './panels/search_query_panel_content';
import { TestConnectionPanelContent } from './panels/test_connection_panel_content';

interface GettingStartedProps {
  apiKeys?: ApiKey[];
  codeArgs: LanguageDefinitionSnippetArguments;
  isPanelLeft?: boolean;
  openApiKeyModal: () => void;
  showPipelinesPanel?: boolean;
}

export const GettingStarted: React.FC<GettingStartedProps> = ({
  apiKeys,
  codeArgs,
  isPanelLeft = false,
  openApiKeyModal,
  showPipelinesPanel,
}) => {
  const { http } = useValues(HttpLogic);
  const { services } = useKibana<KibanaDeps>();

  const assetBasePath = http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/client_libraries`);

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageDefinition>(curlDefinition);

  return (
    <>
      <SelectClientPanel
        docLinks={{
          elasticsearchClients: docLinks.clientsGuide,
          kibanaRunApiInConsole: docLinks.consoleGuide,
        }}
        isPanelLeft={isPanelLeft}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
        application={services.application}
        sharePlugin={services.share}
        consolePlugin={services.console}
      >
        {languageDefinitions.map((language, index) => (
          <EuiFlexItem key={`panelItem.${index}`}>
            <LanguageClientPanel
              language={language}
              setSelectedLanguage={setSelectedLanguage}
              isSelectedLanguage={selectedLanguage === language}
              src={icons[language.id]}
            />
          </EuiFlexItem>
        ))}
      </SelectClientPanel>
      <InstallClientPanel
        codeSnippet={getLanguageDefinitionCodeSnippet(selectedLanguage, 'installClient', codeArgs)}
        consoleRequest={getConsoleRequest('installClient')}
        languages={languageDefinitions}
        language={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        assetBasePath={assetBasePath}
        application={services.application}
        sharePlugin={services.share}
        isPanelLeft={isPanelLeft}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />

      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.content.overview.gettingStarted.generateApiKeyPanel.description',
          {
            defaultMessage:
              "You'll need your private API key to securely connect to your project. Copy it somewhere safe.",
          }
        )}
        leftPanelContent={
          isPanelLeft ? (
            <ApiKeyPanelContent apiKeys={apiKeys} openApiKeyModal={openApiKeyModal} />
          ) : undefined
        }
        rightPanelContent={
          isPanelLeft ? undefined : (
            <ApiKeyPanelContent apiKeys={apiKeys} openApiKeyModal={openApiKeyModal} />
          )
        }
        links={[]}
        title={i18n.translate(
          'xpack.enterpriseSearch.content.overview.gettingStarted.generateApiKeyPanel.panelTitle',
          {
            defaultMessage: 'Generate an API key',
          }
        )}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />

      <CloudDetailsPanel
        cloudId={codeArgs.cloudId}
        elasticsearchUrl={codeArgs.url}
        isPanelLeft={isPanelLeft}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />

      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.configureClient.description',
          {
            defaultMessage: 'Initialize your client with your unique API key',
          }
        )}
        leftPanelContent={
          isPanelLeft ? (
            <InitializeClientPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          ) : undefined
        }
        rightPanelContent={
          isPanelLeft ? undefined : (
            <InitializeClientPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          )
        }
        links={[]}
        title={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.configureClient.title',
          {
            defaultMessage: 'Configure your client',
          }
        )}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />

      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.testConnection.description',
          {
            defaultMessage:
              'Send a test request to confirm your language client and Elasticsearch instance are up and running.',
          }
        )}
        leftPanelContent={
          isPanelLeft ? (
            <TestConnectionPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          ) : undefined
        }
        rightPanelContent={
          isPanelLeft ? undefined : (
            <TestConnectionPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          )
        }
        links={[]}
        title={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.testConnection.title',
          {
            defaultMessage: 'Test your connection',
          }
        )}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />
      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.ingestData.description',
          {
            defaultMessage: 'Add data to your data stream or index to make it searchable',
          }
        )}
        leftPanelContent={
          isPanelLeft ? (
            <AddDataPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          ) : undefined
        }
        rightPanelContent={
          isPanelLeft ? undefined : (
            <AddDataPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          )
        }
        links={[]}
        title={i18n.translate('xpack.enterpriseSearch.overview.gettingStarted.ingestData.title', {
          defaultMessage: 'Ingest Data',
        })}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />

      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.searchQuery.description',
          {
            defaultMessage:
              "Now you're ready to start experimenting with searching and performing aggregations on your Elasticsearch data.",
          }
        )}
        leftPanelContent={
          isPanelLeft ? (
            <SearchQueryPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          ) : undefined
        }
        rightPanelContent={
          isPanelLeft ? undefined : (
            <SearchQueryPanelContent
              assetBasePath={assetBasePath}
              codeArgs={codeArgs}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          )
        }
        links={[]}
        title={i18n.translate('xpack.enterpriseSearch.overview.gettingStarted.searchQuery.title', {
          defaultMessage: 'Build your first search query',
        })}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />
      {showPipelinesPanel && (
        <OverviewPanel
          description={
            <>
              <FormattedMessage
                id="xpack.enterpriseSearch.gettingStarted.pipeline.description"
                defaultMessage="Use {ingestPipelinesLink} to preprocess your data before it's indexed into Elasticsearch, which is often much easier than post-processing. Use any combination of ingest processors to add, delete, or transform fields in your documents."
                values={{
                  ingestPipelinesLink: (
                    <EuiLink
                      data-test-subj="enterpriseSearchElasticsearchOverviewIngestPipelinesLink"
                      href={docLinks.ingestPipelines}
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.gettingStarted.description.ingestPipelinesLink.link',
                        {
                          defaultMessage: 'ingest pipelines',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
              <EuiSpacer />
              <EuiButton
                iconType="plusInCircle"
                size="s"
                href={http.basePath.prepend('/app/management/ingest/ingest_pipelines/create')}
                data-telemetry-id="entSearch-gettingStarted-createPipeline"
                data-test-subj="create-a-pipeline-button"
              >
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.gettingStarted.pipeline.description.createButtonLabel',
                    {
                      defaultMessage: 'Create a pipeline',
                    }
                  )}
                </EuiText>
              </EuiButton>
            </>
          }
          leftPanelContent={<GettingStartedPipelinePanel />}
          links={[]}
          overviewPanelProps={{ color: 'plain', hasShadow: false }}
          title={i18n.translate('xpack.enterpriseSearch.pipeline.title', {
            defaultMessage: 'Transform and enrich your data',
          })}
        />
      )}
    </>
  );
};
