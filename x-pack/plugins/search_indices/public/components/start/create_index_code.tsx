/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useSearchApiKey } from '@kbn/search-api-keys-components';
import { AnalyticsEvents } from '../../analytics/constants';
import { Languages, AvailableLanguages, LanguageOptions } from '../../code_examples';

import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { useKibana } from '../../hooks/use_kibana';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

import { CodeSample } from '../shared/code_sample';
import { LanguageSelector } from '../shared/language_selector';

import { CreateIndexFormState } from './types';
import { useStartPageCodingExamples } from './hooks/use_coding_examples';
import { APIKeyCallout } from './api_key_callout';

export interface CreateIndexCodeViewProps {
  createIndexForm: CreateIndexFormState;
  changeCodingLanguage: (language: AvailableLanguages) => void;
  canCreateApiKey?: boolean;
}

export const CreateIndexCodeView = ({
  createIndexForm,
  changeCodingLanguage,
  canCreateApiKey,
}: CreateIndexCodeViewProps) => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const usageTracker = useUsageTracker();
  const selectedCodeExamples = useStartPageCodingExamples();

  const { codingLanguage: selectedLanguage } = createIndexForm;
  const onSelectLanguage = useCallback(
    (value: AvailableLanguages) => {
      changeCodingLanguage(value);
      usageTracker.count([
        AnalyticsEvents.startCreateIndexLanguageSelect,
        `${AnalyticsEvents.startCreateIndexLanguageSelect}_${value}`,
      ]);
    },
    [usageTracker, changeCodingLanguage]
  );
  const elasticsearchUrl = useElasticsearchUrl();
  const { apiKey, apiKeyIsVisible } = useSearchApiKey();

  const codeParams = useMemo(() => {
    return {
      indexName: createIndexForm.indexName || undefined,
      elasticsearchURL: elasticsearchUrl,
      apiKey: apiKeyIsVisible && apiKey ? apiKey : undefined,
    };
  }, [createIndexForm.indexName, elasticsearchUrl, apiKeyIsVisible, apiKey]);
  const selectedCodeExample = useMemo(() => {
    return selectedCodeExamples[selectedLanguage];
  }, [selectedLanguage, selectedCodeExamples]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="createIndexCodeView">
      {canCreateApiKey && (
        <EuiFlexItem grow={true}>
          <APIKeyCallout apiKey={apiKey} />
        </EuiFlexItem>
      )}
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
              request={selectedCodeExamples.sense.createIndex(codeParams)}
              application={application}
              sharePlugin={share}
              consolePlugin={consolePlugin}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {selectedCodeExample.installCommand && (
        <CodeSample
          title={i18n.translate('xpack.searchIndices.startPage.codeView.installCommand.title', {
            defaultMessage: 'Install Elasticsearch serverless client',
          })}
          language="shell"
          code={selectedCodeExample.installCommand}
          onCodeCopyClick={() => {
            usageTracker.click([
              AnalyticsEvents.startCreateIndexCodeCopyInstall,
              `${AnalyticsEvents.startCreateIndexCodeCopyInstall}_${selectedLanguage}`,
            ]);
          }}
        />
      )}
      <CodeSample
        id="createIndex"
        title={i18n.translate('xpack.searchIndices.startPage.codeView.createIndex.title', {
          defaultMessage: 'Connect and create an index',
        })}
        language={Languages[selectedLanguage].codeBlockLanguage}
        code={selectedCodeExample.createIndex(codeParams)}
        onCodeCopyClick={() => {
          usageTracker.click([
            AnalyticsEvents.startCreateIndexCodeCopy,
            `${AnalyticsEvents.startCreateIndexCodeCopy}_${selectedLanguage}`,
            `${AnalyticsEvents.startCreateIndexCodeCopy}_${selectedLanguage}_${selectedCodeExamples.exampleType}`,
          ]);
        }}
      />
    </EuiFlexGroup>
  );
};
