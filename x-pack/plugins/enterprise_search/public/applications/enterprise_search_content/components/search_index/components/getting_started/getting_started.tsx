/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { css } from '@emotion/react';
import dedent from 'dedent';
import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SelectClientPanel,
  LanguageDefinition,
  LanguageClientPanel,
  InstallClientPanel,
  OverviewPanel,
  CodeBox,
  getLanguageDefinitionCodeSnippet,
  getConsoleRequest,
} from '@kbn/search-api-panels';

import { LanguageDefinition } from '@kbn/search-api-panels';

import { PLUGIN_ID } from '../../../../../../../common/constants';
import { KibanaDeps } from '../../../../../../../common/types';

import { icons } from '../../../../../../assets/client_libraries';
import { useCloudDetails } from '../../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../../shared/doc_links';

import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { IndexViewLogic } from '../../index_view_logic';
import { OverviewLogic } from '../../overview.logic';
import { GenerateApiKeyModal } from '../generate_api_key_modal/modal';

import { javascriptDefinition } from './languages/javascript';
import { languageDefinitions } from './languages/languages';

const DEFAULT_URL = 'https://localhost:9200';

export const APIGettingStarted = () => {
  const { http } = useValues(HttpLogic);
  const { apiKey, isGenerateModalOpen } = useValues(OverviewLogic);
  const { openGenerateModal, closeGenerateModal } = useActions(OverviewLogic);
  const { indexName } = useValues(IndexViewLogic);
  const { services } = useKibana<KibanaDeps>();

  const cloudContext = useCloudDetails();

  const codeArgs = {
    apiKey,
    cloudId: cloudContext.cloudId,
    indexName,
    url: cloudContext.elasticsearchUrl || DEFAULT_URL,
  };
  const assetBasePath = http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/client_libraries/`);

  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);
  return (
    <>
      {isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexName} onClose={closeGenerateModal} />
      )}
      <EuiTitle size="l">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.content.overview.gettingStarted.pageTitle', {
            defaultMessage: 'Getting Started with Elastic API',
          })}
        </h2>
      </EuiTitle>
      <SelectClientPanel
        docLinks={{
          elasticsearchClients: docLinks.clientsGuide,
          kibanaRunApiInConsole: docLinks.consoleGuide,
        }}
        http={http}
        isPanelLeft={false}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
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
        isPanelLeft={false}
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
        rightPanelContent={
          <EuiPanel>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h5>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.overview.gettingStarted.generateApiKeyPanel.apiKeytitle',
                      {
                        defaultMessage: 'Generate an API key',
                      }
                    )}
                  </h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.overview.gettingStarted.generateApiKeyPanel.apiKeydesc',
                    {
                      defaultMessage:
                        'Your private, unique identifier for authentication and authorization.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      key="viewApiKeys"
                      iconType="plusInCircle"
                      onClick={openGenerateModal}
                      fill
                    >
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.overview.documementExample.generateApiKeyButton.createNew',
                            { defaultMessage: 'New' }
                          )}
                        </p>
                      </EuiText>
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      key="viewApiKeys"
                      iconType="popout"
                      iconSide="right"
                      onClick={() =>
                        KibanaLogic.values.navigateToUrl('/app/management/security/api_keys', {
                          shouldNotCreateHref: true,
                        })
                      }
                    >
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.overview.documementExample.generateApiKeyButton.viewAll',
                            { defaultMessage: 'Manage' }
                          )}
                        </p>
                      </EuiText>
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
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

      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.content.overview.gettingStarted.cloudId.description',
          {
            defaultMessage: "You'll need this to identify your deployment.",
          }
        )}
        rightPanelContent={
          <EuiSplitPanel.Outer>
            <EuiSplitPanel.Inner>
              <EuiTitle size="xs">
                <h5>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.overview.gettingStarted.cloudId.elasticTitle',
                    {
                      defaultMessage: 'Store your Elasticsearch URL',
                    }
                  )}
                </h5>
              </EuiTitle>
              <EuiText>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.overview.gettingStarted.cloudId.desc',
                  {
                    defaultMessage: 'Unique identifier for your deployment. ',
                  }
                )}
              </EuiText>
            </EuiSplitPanel.Inner>
            <EuiThemeProvider colorMode="dark">
              <EuiSplitPanel.Inner paddingSize="none">
                <EuiCodeBlock
                  isCopyable
                  fontSize="m"
                  // Code block isn't respecting overflow in only this situation
                  css={css`
                    overflow-wrap: anywhere;
                  `}
                >
                  {codeArgs.cloudId
                    ? dedent`{
                    CloudID: "${codeArgs.cloudId}",
                    Url: "${codeArgs.url}",
                  }`
                    : codeArgs.url}
                </EuiCodeBlock>
              </EuiSplitPanel.Inner>
            </EuiThemeProvider>
          </EuiSplitPanel.Outer>
        }
        links={[]}
        title={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.cloudId.panelTitleElastic',
          {
            defaultMessage: 'Copy your Elasticsearch URL',
          }
        )}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />

      <OverviewPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.overview.gettingStarted.configureClient.description',
          {
            defaultMessage: 'Initialize your client with your unique API key',
          }
        )}
        rightPanelContent={
          <CodeBox
            languages={languageDefinitions}
            codeSnippet={getLanguageDefinitionCodeSnippet(
              selectedLanguage,
              'configureClient',
              codeArgs
            )}
            consoleRequest={getConsoleRequest('configureClient')}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            assetBasePath={assetBasePath}
            application={services.application}
            sharePlugin={services.share}
          />
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
        rightPanelContent={
          <CodeBox
            languages={languageDefinitions}
            codeSnippet={getLanguageDefinitionCodeSnippet(
              selectedLanguage,
              'testConnection',
              codeArgs
            )}
            consoleRequest={getConsoleRequest('testConnection')}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            assetBasePath={assetBasePath}
            application={services.application}
            sharePlugin={services.share}
          />
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
        rightPanelContent={
          <CodeBox
            languages={languageDefinitions}
            codeSnippet={getLanguageDefinitionCodeSnippet(selectedLanguage, 'ingestData', codeArgs)}
            consoleRequest={getConsoleRequest('ingestData')}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            assetBasePath={assetBasePath}
            application={services.application}
            sharePlugin={services.share}
          />
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
        rightPanelContent={
          <CodeBox
            languages={languageDefinitions}
            codeSnippet={getLanguageDefinitionCodeSnippet(
              selectedLanguage,
              'buildSearchQuery',
              codeArgs
            )}
            consoleRequest={getConsoleRequest('buildSearchQuery')}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            assetBasePath={assetBasePath}
            application={services.application}
            sharePlugin={services.share}
          />
        }
        links={[]}
        title={i18n.translate('xpack.enterpriseSearch.overview.gettingStarted.searchQuery.title', {
          defaultMessage: 'Build your first search query',
        })}
        overviewPanelProps={{ color: 'plain', hasShadow: false }}
      />
    </>
  );
};
