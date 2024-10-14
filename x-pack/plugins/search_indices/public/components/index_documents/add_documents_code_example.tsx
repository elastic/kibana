/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { useKibana } from '../../hooks/use_kibana';
import { IngestCodeSnippetParameters } from '../../types';
import { LanguageSelector } from '../shared/language_selector';
import { useIngestCodeExamples } from './hooks/use_ingest_code_examples';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { AvailableLanguages, LanguageOptions, Languages } from '../../code_examples';
import { AnalyticsEvents } from '../../analytics/constants';
import { CodeSample } from '../shared/code_sample';
import { generateSampleDocument } from '../../utils/document_generation';
import { getDefaultCodingLanguage } from '../../utils/language';

export interface AddDocumentsCodeExampleProps {
  indexName: string;
  mappingProperties: Record<string, MappingProperty>;
}

export const AddDocumentsCodeExample = ({
  indexName,
  mappingProperties,
}: AddDocumentsCodeExampleProps) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const ingestCodeExamples = useIngestCodeExamples();
  const elasticsearchUrl = useElasticsearchUrl();
  const usageTracker = useUsageTracker();
  const indexHasMappings = Object.keys(mappingProperties).length > 0;

  const [selectedLanguage, setSelectedLanguage] =
    useState<AvailableLanguages>(getDefaultCodingLanguage);
  const selectedCodeExamples = ingestCodeExamples[selectedLanguage];
  const codeSampleMappings = indexHasMappings
    ? mappingProperties
    : ingestCodeExamples.defaultMapping;
  const onSelectLanguage = useCallback(
    (value: AvailableLanguages) => {
      setSelectedLanguage(value);
      usageTracker.count([
        AnalyticsEvents.startCreateIndexLanguageSelect,
        `${AnalyticsEvents.startCreateIndexLanguageSelect}_${value}`,
      ]);
    },
    [usageTracker]
  );
  const sampleDocument = useMemo(() => {
    // TODO: implement smart document generation
    return generateSampleDocument(codeSampleMappings);
  }, [codeSampleMappings]);
  const { apiKey, apiKeyIsVisible } = useSearchApiKey();
  const codeParams: IngestCodeSnippetParameters = useMemo(() => {
    return {
      indexName,
      elasticsearchURL: elasticsearchUrl,
      sampleDocument,
      indexHasMappings,
      mappingProperties: codeSampleMappings,
      apiKey: apiKeyIsVisible && apiKey ? apiKey : undefined,
    };
  }, [
    indexName,
    elasticsearchUrl,
    sampleDocument,
    codeSampleMappings,
    indexHasMappings,
    apiKeyIsVisible,
    apiKey,
  ]);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="SearchIndicesAddDocumentsCode"
    >
      <EuiFlexGroup direction="column">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem css={{ maxWidth: '300px' }}>
            <LanguageSelector
              options={LanguageOptions}
              selectedLanguage={selectedLanguage}
              onSelectLanguage={onSelectLanguage}
            />
          </EuiFlexItem>
          {selectedLanguage === 'curl' && (
            <EuiFlexItem grow={false}>
              <TryInConsoleButton
                request={
                  !indexHasMappings
                    ? `${ingestCodeExamples.sense.updateMappingsCommand(
                        codeParams
                      )}\n\n${ingestCodeExamples.sense.ingestCommand(codeParams)}`
                    : ingestCodeExamples.sense.ingestCommand(codeParams)
                }
                application={application}
                sharePlugin={share}
                consolePlugin={consolePlugin}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText>
          <p>{ingestCodeExamples.description}</p>
        </EuiText>
        {selectedCodeExamples.installCommand && (
          <EuiFlexItem>
            <CodeSample
              id="installCodeExample"
              title={i18n.translate('xpack.searchIndices.indexDetails.installLibrary.title', {
                defaultMessage: 'Install Elasticsearch library',
              })}
              language="shell"
              code={selectedCodeExamples.installCommand}
              onCodeCopyClick={() => {
                usageTracker.click([
                  AnalyticsEvents.indexDetailsInstallCodeCopy,
                  `${AnalyticsEvents.indexDetailsInstallCodeCopy}_${selectedLanguage}`,
                ]);
              }}
            />
          </EuiFlexItem>
        )}
        {!indexHasMappings && (
          <EuiFlexItem>
            <CodeSample
              id="addMappingsCodeExample"
              title={i18n.translate('xpack.searchIndices.indexDetails.addMappingsCode.title', {
                defaultMessage: 'Add mappings to your index',
              })}
              language={Languages[selectedLanguage].codeBlockLanguage}
              code={selectedCodeExamples.updateMappingsCommand(codeParams)}
              onCodeCopyClick={() => {
                usageTracker.click([
                  AnalyticsEvents.indexDetailsAddMappingsCodeCopy,
                  `${AnalyticsEvents.indexDetailsAddMappingsCodeCopy}_${selectedLanguage}`,
                ]);
              }}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <CodeSample
            id="ingestDataCodeExample"
            title={ingestCodeExamples.ingestTitle}
            language={Languages[selectedLanguage].codeBlockLanguage}
            code={selectedCodeExamples.ingestCommand(codeParams)}
            onCodeCopyClick={() => {
              usageTracker.click([
                AnalyticsEvents.indexDetailsIngestDocumentsCodeCopy,
                `${AnalyticsEvents.indexDetailsIngestDocumentsCodeCopy}_${selectedLanguage}`,
              ]);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
