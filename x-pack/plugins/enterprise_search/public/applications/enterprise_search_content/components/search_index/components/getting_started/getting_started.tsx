/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { css } from '@emotion/react';
import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  SelectClientPanel,
  LanguageClientPanel,
  InstallClientPanel,
  OverviewPanel,
  CodeBox,
} from '@kbn/serverless-api-panels';

import { javascriptDefinition } from '@kbn/serverless-api-panels/languages/javascript';
import { languageDefinitions } from '@kbn/serverless-api-panels/languages/languages';
import { LanguageDefinition } from '@kbn/serverless-api-panels/languages/types';

import { KibanaDeps } from '../../../../../../../common/types';

import { icons } from '../../../../../../assets/client_libraries';
import { useCloudDetails } from '../../../../../shared/cloud_details/cloud_details';
import { docLinks } from '../../../../../shared/doc_links';

import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { IndexViewLogic } from '../../index_view_logic';
import { OverviewLogic } from '../../overview.logic';
import { GenerateApiKeyModal } from '../generate_api_key_modal/modal';

export const APIGettingStarted = () => {
  const { http } = useValues(HttpLogic);
  const { apiKey, isGenerateModalOpen } = useValues(OverviewLogic);
  const { openGenerateModal, closeGenerateModal } = useActions(OverviewLogic);
  const { indexName } = useValues(IndexViewLogic);
  const { services } = useKibana<KibanaDeps>();

  const cloudContext = useCloudDetails();
  const DEFAULT_URL = 'https://localhost:9200';

  const codeArgs = {
    apiKey,
    url: cloudContext.elasticsearchUrl || DEFAULT_URL,
  };

  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);
  return (
    <>
      {isGenerateModalOpen && (
        <GenerateApiKeyModal indexName={indexName} onClose={closeGenerateModal} />
      )}
      <SelectClientPanel docLinks={docLinks} http={http} isPanelLeft={false}>
        {languageDefinitions.map((language, index) => (
          <EuiFlexItem key={`panelItem.${index}`}>
            <LanguageClientPanel
              language={language}
              setSelectedLanguage={setSelectedLanguage}
              isSelectedLanguage={selectedLanguage === language}
              http={http}
              src={icons[language.id]}
            />
          </EuiFlexItem>
        ))}
      </SelectClientPanel>
      <InstallClientPanel
        codeArguments={codeArgs}
        language={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        http={http}
        pluginId={''}
        isPanelLeft={false}
        application={services.application}
        sharePlugin={services.share}
      />

      <OverviewPanel
        description={
          "You'll need your private API key to securely connect to your project. Copy it somewhere safe."
        }
        rightPanelContent={
          <EuiPanel>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle>
                  <p>Generate an API key</p>
                </EuiTitle>
                <EuiText>
                  Your private, unique identifier for authentication and authorization.
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
        title={'Generate an API key'}
      />

      <OverviewPanel
        description={"You'll need this to identify your project."}
        rightPanelContent={
          <EuiSplitPanel.Outer>
            <EuiSplitPanel.Inner>
              <EuiText>
                {i18n.translate('xpack.serverlessSearch.apiKey.stepTwoDescription', {
                  defaultMessage: 'Unique identifier for specific project. ',
                })}
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
                  {'cloudid'}
                </EuiCodeBlock>
              </EuiSplitPanel.Inner>
            </EuiThemeProvider>
          </EuiSplitPanel.Outer>
        }
        links={[]}
        title={'Copy your Cloud ID'}
      />

      <OverviewPanel
        description={i18n.translate('xpack.serverlessSearch.configureClient.description', {
          defaultMessage: 'Initialize your client with your unique API key and Cloud ID',
        })}
        rightPanelContent={
          <CodeBox
            code="configureClient"
            codeArgs={codeArgs}
            languages={languageDefinitions}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            http={http}
            pluginId={''}
            application={services.application}
            sharePlugin={services.share}
          />
        }
        links={[
          ...(selectedLanguage.basicConfig
            ? [
                {
                  href: selectedLanguage.basicConfig,
                  label: i18n.translate('xpack.serverlessSearch.configureClient.basicConfigLabel', {
                    defaultMessage: 'Basic configuration',
                  }),
                },
              ]
            : []),
          ...(selectedLanguage.advancedConfig
            ? [
                {
                  href: selectedLanguage.advancedConfig,
                  label: i18n.translate(
                    'xpack.serverlessSearch.configureClient.advancedConfigLabel',
                    {
                      defaultMessage: 'Advanced configuration',
                    }
                  ),
                },
              ]
            : []),
        ]}
        title={i18n.translate('xpack.serverlessSearch.configureClient.title', {
          defaultMessage: 'Configure your client',
        })}
      />

      <OverviewPanel
        description={i18n.translate('xpack.serverlessSearch.testConnection.description', {
          defaultMessage:
            'Send a test request to confirm your language client and Elasticsearch instance are up and running.',
        })}
        rightPanelContent={
          <CodeBox
            code="testConnection"
            codeArgs={codeArgs}
            languages={languageDefinitions}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            http={http}
            pluginId={''}
            application={services.application}
            sharePlugin={services.share}
          />
        }
        links={[]}
        title={i18n.translate('xpack.serverlessSearch.testConnection.title', {
          defaultMessage: 'Test your connection',
        })}
      />
      <OverviewPanel
        description={'Add data to your data stream or index to make it searchable'}
        rightPanelContent={
          <CodeBox
            code="ingestData"
            codeArgs={codeArgs}
            languages={languageDefinitions}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            http={http}
            pluginId={''}
            application={services.application}
            sharePlugin={services.share}
          />
        }
        links={[]}
        title={'Ingest Data'}
      />

      <OverviewPanel
        description={i18n.translate('xpack.serverlessSearch.searchQuery.description', {
          defaultMessage:
            "Now you're ready to start experimenting with searching and performing aggregations on your Elasticsearch data.",
        })}
        rightPanelContent={
          <CodeBox
            code="buildSearchQuery"
            codeArgs={codeArgs}
            languages={languageDefinitions}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            http={http}
            pluginId={''}
            application={services.application}
            sharePlugin={services.share}
          />
        }
        links={[]}
        title={i18n.translate('xpack.serverlessSearch.searchQuery.title', {
          defaultMessage: 'Build your first search query',
        })}
      />
    </>
  );
};
