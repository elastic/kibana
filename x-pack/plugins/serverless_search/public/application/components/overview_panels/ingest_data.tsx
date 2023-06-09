/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { docLinks } from '../../../../common/doc_links';
import { CodeBox } from '../code_box';
import { languageDefinitions } from '../languages/languages';
import { LanguageDefinition, LanguageDefinitionSnippetArguments } from '../languages/types';
import { OverviewPanel } from './overview_panel';
import { IntegrationsPanel } from './integrations_panel';

interface IngestDataProps {
  codeArguments: LanguageDefinitionSnippetArguments;
  selectedLanguage: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
}

export const IngestData: React.FC<IngestDataProps> = ({
  codeArguments,
  selectedLanguage,
  setSelectedLanguage,
}) => {
  const [selectedIngestMethod, setSelectedIngestMethod] = useState<
    'ingestViaApi' | 'ingestViaIntegration'
  >('ingestViaApi');
  return (
    <OverviewPanel
      description={i18n.translate('xpack.serverlessSearch.ingestData.description', {
        defaultMessage:
          'Add data to your data stream or index to make it searchable. Choose an ingestion method that fits your application and workflow.',
      })}
      leftPanelContent={
        selectedIngestMethod === 'ingestViaApi' ? (
          <CodeBox
            code="ingestData"
            codeArgs={codeArguments}
            languages={languageDefinitions}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
          />
        ) : (
          <IntegrationsPanel />
        )
      }
      links={[
        ...(selectedLanguage.apiReference
          ? [
              {
                href: selectedLanguage.apiReference,
                label: i18n.translate('xpack.serverlessSearch.ingestData.clientDocLink', {
                  defaultMessage: '{languageName} API reference',
                  values: { languageName: selectedLanguage.name },
                }),
              },
            ]
          : []),
        {
          href: docLinks.integrations,
          label: i18n.translate('xpack.serverlessSearch.ingestData.integrationsLink', {
            defaultMessage: 'About Integrations',
          }),
        },
      ]}
      title={i18n.translate('xpack.serverlessSearch.ingestData.title', {
        defaultMessage: 'Ingest data',
      })}
    >
      <EuiFormFieldset
        legend={{
          children: i18n.translate('xpack.serverlessSearch.ingestData.ingestLegendLabel', {
            defaultMessage: 'Select an ingestion method',
          }),
          display: 'hidden',
        }}
      >
        <EuiCheckableCard
          hasShadow
          id="ingestViaApi"
          label={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.serverlessSearch.ingestData.ingestApiLabel', {
                  defaultMessage: 'Ingest via API',
                })}
              </h3>
            </EuiTitle>
          }
          value="ingestViaApi"
          checked={selectedIngestMethod === 'ingestViaApi'}
          onChange={() => setSelectedIngestMethod('ingestViaApi')}
        >
          <EuiText>
            {i18n.translate('xpack.serverlessSearch.ingestData.ingestApiDescription', {
              defaultMessage:
                'The most flexible way to index data, enabling full control over your customization and optimization options.',
            })}
          </EuiText>
        </EuiCheckableCard>
        <EuiSpacer />
        <EuiCheckableCard
          hasShadow
          id="ingestViaIntegration"
          label={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.serverlessSearch.ingestData.ingestIntegrationLabel', {
                  defaultMessage: 'Ingest via integration',
                })}
              </h3>
            </EuiTitle>
          }
          value="ingestViaIntegration"
          checked={selectedIngestMethod === 'ingestViaIntegration'}
          onChange={() => setSelectedIngestMethod('ingestViaIntegration')}
        >
          <EuiText>
            {i18n.translate('xpack.serverlessSearch.ingestData.ingestIntegrationDescription', {
              defaultMessage:
                'Specialized ingestion tools optimized for transforming data and shipping it to Elasticsearch.',
            })}
          </EuiText>
        </EuiCheckableCard>
      </EuiFormFieldset>
    </OverviewPanel>
  );
};
