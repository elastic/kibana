/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@tanstack/react-query';
import {
  OverviewPanel,
  LanguageClientPanel,
  CodeBox,
  getLanguageDefinitionCodeSnippet,
  getConsoleRequest,
} from '@kbn/search-api-panels';
import type {
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';

import { PLUGIN_ID } from '../../../common';
import { docLinks } from '../../../common/doc_links';
import { IndexData, FetchIndicesResult } from '../../../common/types';
import { FETCH_INDICES_PATH } from '../routes';
import { API_KEY_PLACEHOLDER, ELASTICSEARCH_URL_PLACEHOLDER } from '../constants';
import { useKibanaServices } from '../hooks/use_kibana';
import { javascriptDefinition } from './languages/javascript';
import { languageDefinitions } from './languages/languages';

const NoIndicesContent = () => (
  <>
    <EuiSpacer />
    <EuiText>
      <FormattedMessage
        id="xpack.serverlessSearch.content.indexingApi.clientPanel.noIndices.helpText"
        defaultMessage="Don't have an index yet? {getStartedLink}"
        values={{
          getStartedLink: (
            <EuiLink href={docLinks.gettingStartedIngest} external>
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

interface IndicesContentProps {
  indices: IndexData[];
  isLoading: boolean;
  onChange: (selectedOptions: Array<EuiComboBoxOptionOption<IndexData>>) => void;
  selectedIndex?: IndexData;
  setSearchValue: (searchValue?: string) => void;
}
const IndicesContent = ({
  indices,
  isLoading,
  onChange,
  selectedIndex,
  setSearchValue,
}: IndicesContentProps) => {
  const toOption = (index: IndexData) => ({ label: index.name, value: index });
  const options: Array<EuiComboBoxOptionOption<IndexData>> = indices.map(toOption);
  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.serverlessSearch.content.indexingApi.index.comboBox.title',
              { defaultMessage: 'Index' }
            )}
          >
            <EuiComboBox
              async
              fullWidth
              isLoading={isLoading}
              singleSelection={{ asPlainText: true }}
              onChange={onChange}
              onSearchChange={setSearchValue}
              options={options}
              selectedOptions={selectedIndex ? [toOption(selectedIndex)] : undefined}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            title={selectedIndex ? selectedIndex.count.toLocaleString() : '--'}
            titleColor="primary"
            description={i18n.translate(
              'xpack.serverlessSearch.content.indexingApi.index.documentCount.description',
              { defaultMessage: 'Documents' }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const ElasticsearchIndexingApi = () => {
  const { cloud, http, share } = useKibanaServices();
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageDefinition>(javascriptDefinition);
  const [indexSearchQuery, setIndexSearchQuery] = useState<string | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState<IndexData | undefined>(undefined);
  const elasticsearchURL = useMemo(() => {
    return cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER;
  }, [cloud]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['indices', { searchQuery: indexSearchQuery }],
    queryFn: async () => {
      const query = {
        search_query: indexSearchQuery || null,
      };
      const result = await http.get<FetchIndicesResult>(FETCH_INDICES_PATH, { query });
      return result;
    },
  });

  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchURL,
    apiKey: API_KEY_PLACEHOLDER,
    indexName: selectedIndex?.name,
  };
  const showNoIndices = !isLoading && data?.indices?.length === 0 && indexSearchQuery === undefined;

  return (
    <EuiPageTemplate
      offset={0}
      grow
      restrictWidth
      data-test-subj="svlSearchIndexingApiPage"
      panelled
    >
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
      {isError && (
        <EuiPageTemplate.Section>
          <EuiCallOut
            color="danger"
            title={i18n.translate(
              'xpack.serverlessSearch.content.indexingApi.fetchIndices.error.title',
              { defaultMessage: 'Error fetching indices' }
            )}
          />
        </EuiPageTemplate.Section>
      )}
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
                      http={http}
                      pluginId={PLUGIN_ID}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer />
              <CodeBox
                languages={languageDefinitions}
                codeSnippet={getLanguageDefinitionCodeSnippet(
                  selectedLanguage,
                  'ingestDataIndex',
                  codeSnippetArguments
                )}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                http={http}
                pluginId={PLUGIN_ID}
                sharePlugin={share}
                consoleRequest={getConsoleRequest('ingestDataIndex')}
              />
            </>
          }
          links={
            showNoIndices
              ? undefined
              : [
                  {
                    label: i18n.translate(
                      'xpack.serverlessSearch.content.indexingApi.ingestDocsLink',
                      { defaultMessage: 'Ingestion documentation' }
                    ),
                    href: docLinks.gettingStartedIngest,
                  },
                ]
          }
        >
          {showNoIndices ? (
            <NoIndicesContent />
          ) : (
            <IndicesContent
              isLoading={isLoading}
              indices={data?.indices ?? []}
              onChange={(options) => {
                setSelectedIndex(options?.[0]?.value);
              }}
              setSearchValue={setIndexSearchQuery}
              selectedIndex={selectedIndex}
            />
          )}
        </OverviewPanel>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
