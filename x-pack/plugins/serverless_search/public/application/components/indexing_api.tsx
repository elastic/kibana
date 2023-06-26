/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CodeBox } from './code_box';
import { javascriptDefinition } from './languages/javascript';
import { languageDefinitions } from './languages/languages';
import { LanguageDefinition } from './languages/types';

import { OverviewPanel } from './overview_panels/overview_panel';
import { LanguageClientPanel } from './overview_panels/language_client_panel';

const NoIndicesContent = () => (
  <>
    <EuiSpacer />
    <EuiText>
      <FormattedMessage
        id="xpack.serverlessSearch.content.indexingApi.clientPanel.noIndices.helpText"
        defaultMessage="Don't have an index yet? {getStartedLink}"
        values={{
          getStartedLink: (
            <EuiLink href="#" external>
              {i18n.translate(
                'xpack.serverlessSearch.content.indexingApi.clientPanel.noIndices.getStartedLink',
                { defaultMessage: 'Get started' }
              )}
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  </>
);

export const ElasticsearchIndexingApi = () => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchIndexingApiPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.serverlessSearch.content.indexingApi.header.title', {
          defaultMessage: 'Indexing API',
        })}
        description={i18n.translate(
          'xpack.serverlessSearch.content.indexingApi.header.description',
          {
            defaultMessage:
              'Add data to your data stream or index to make it searchable. Choose an ingestion method that fits your application and workflow.',
          }
        )}
        bottomBorder="extended"
      />
      <EuiPageTemplate.Section color="subdued" bottomBorder="extended">
        <OverviewPanel
          title={i18n.translate('xpack.serverlessSearch.content.indexingApi.clientPanel.title', {
            defaultMessage: 'Ingest data for the first time',
          })}
          description={i18n.translate(
            'xpack.serverlessSearch.content.indexingApi.clientPanel.description',
            { defaultMessage: 'Adding documents to your already created index using the API' }
          )}
          leftPanelContent={
            <>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate(
                        'xpack.serverlessSearch.content.indexingApi.clientPanel.selectClient.heading',
                        {
                          defaultMessage: 'Choose one',
                        }
                      )}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="xs" direction="row">
                {languageDefinitions.map((language, index) => (
                  <EuiFlexItem key={`panelItem.${index}`}>
                    <LanguageClientPanel
                      language={language}
                      setSelectedLanguage={setSelectedLanguage}
                      isSelectedLanguage={selectedLanguage === language}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer />
              <CodeBox
                code="ingestData"
                codeArgs={{ url: '', apiKey: '' }}
                languages={languageDefinitions}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
              />
            </>
          }
        >
          <NoIndicesContent />
        </OverviewPanel>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
