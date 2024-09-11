/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';

import { useKibana } from '../../hooks/use_kibana';
import { CodeSample } from './code_sample';
import { CreateIndexFormState } from './types';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '../../constants';

import { Languages, AvailableLanguages, LanguageOptions } from '../../code_examples';
import { DenseVectorSeverlessCodeExamples } from '../../code_examples/create_index';

import { LanguageSelector } from '../shared/language_selector';

export interface CreateIndexCodeViewProps {
  createIndexForm: CreateIndexFormState;
}

// TODO: this will be dynamic based on stack / es3 & onboarding token
const SelectedCodeExamples = DenseVectorSeverlessCodeExamples;

export const CreateIndexCodeView = ({ createIndexForm }: CreateIndexCodeViewProps) => {
  const { application, cloud, share, console: consolePlugin } = useKibana().services;
  // TODO: initing this should be dynamic and possibly saved in the form state
  const [selectedLanguage, setSelectedLanguage] = useState<AvailableLanguages>('python');
  const codeParams = useMemo(() => {
    return {
      indexName: createIndexForm.indexName || undefined,
      elasticsearchURL: cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER,
    };
  }, [createIndexForm.indexName, cloud]);
  const selectedCodeExample = useMemo(() => {
    return SelectedCodeExamples[selectedLanguage];
  }, [selectedLanguage]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiPanel color="subdued">
          <div>TODO - API KEY Panel</div>
        </EuiPanel>
      </EuiFlexItem>
      <EuiHorizontalRule />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <LanguageSelector
            options={LanguageOptions}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={(value) => setSelectedLanguage(value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TryInConsoleButton
            request={SelectedCodeExamples.sense.createIndex(codeParams)}
            application={application}
            sharePlugin={share}
            consolePlugin={consolePlugin}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedCodeExample.installCommand && (
        <CodeSample
          title={i18n.translate('xpack.searchIndices.startPage.codeView.installCommand.title', {
            defaultMessage: 'Install Elasticsearch serverless client',
          })}
          language="shell"
          code={selectedCodeExample.installCommand}
        />
      )}
      <CodeSample
        title={i18n.translate('xpack.searchIndices.startPage.codeView.createIndex.title', {
          defaultMessage: 'Connect and create an index',
        })}
        language={Languages[selectedLanguage].codeBlockLanguage}
        code={selectedCodeExample.createIndex(codeParams)}
      />
    </EuiFlexGroup>
  );
};
