/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

import { SettingsLogic } from './settings_logic';
import { SettingsPanel } from './settings_panel';

export const Settings: React.FC = () => {
  const { makeRequest, setPipeline } = useActions(SettingsLogic);
  const { defaultPipeline, hasNoChanges, isLoading, pipelineState } = useValues(SettingsLogic);

  const {
    extract_binary_content: extractBinaryContent,
    reduce_whitespace: reduceWhitespace,
    run_ml_inference: runMLInference,
  } = pipelineState;

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        i18n.translate('xpack.enterpriseSearch.content.settings.breadcrumb', {
          defaultMessage: 'Settings',
        }),
      ]}
      pageHeader={{
        description: (
          <FormattedMessage
            id="xpack.enterpriseSearch.content.settings.description"
            defaultMessage="These settings apply to all new Elasticsearch indices created by Enterprise Search ingestion mechanisms. For API ingest-based indices, remember to include the pipeline when you ingest documents. These features are powered by {link}."
            values={{
              link: (
                <EuiLink href={docLinks.ingestPipelines} target="_blank">
                  {i18n.translate('xpack.enterpriseSearch.content.settings.ingestLink', {
                    defaultMessage: 'ingest pipelines',
                  })}
                </EuiLink>
              ),
            }}
          />
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.settings.headerTitle', {
          defaultMessage: 'Content Settings',
        }),
        rightSideItems: [
          <EuiButton
            fill
            disabled={hasNoChanges}
            isLoading={isLoading}
            onClick={() => makeRequest(pipelineState)}
          >
            {i18n.translate('xpack.enterpriseSearch.content.settings.saveButtonLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>,
          <EuiButton
            disabled={hasNoChanges}
            isLoading={isLoading}
            onClick={() => setPipeline(defaultPipeline)}
          >
            {i18n.translate('xpack.enterpriseSearch.content.settings.resetButtonLabel', {
              defaultMessage: 'Reset',
            })}
          </EuiButton>,
        ],
      }}
      pageViewTelemetry="Settings"
      isLoading={false}
    >
      <SettingsPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.content.settings.contentExtraction.description',
          {
            defaultMessage:
              'Extract searchable content from binary files, like PDFs and Word documents.',
          }
        )}
        label={i18n.translate('xpack.enterpriseSearch.content.settings.contactExtraction.label', {
          defaultMessage: 'Content extraction',
        })}
        onChange={() =>
          setPipeline({
            ...pipelineState,
            extract_binary_content: !pipelineState.extract_binary_content,
          })
        }
        title={i18n.translate('xpack.enterpriseSearch.content.settings.contentExtraction.title', {
          defaultMessage: 'Deployment wide content extraction',
        })}
        value={extractBinaryContent}
      />
      <EuiSpacer size="s" />
      <SettingsPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.content.settings.whiteSpaceReduction.description',
          {
            defaultMessage:
              'Whitespace reduction will strip your full-text content of whitespace by default.',
          }
        )}
        label={i18n.translate('xpack.enterpriseSearch.content.settings.whitespaceReduction.label', {
          defaultMessage: 'Whitespace reduction',
        })}
        onChange={() =>
          setPipeline({
            ...pipelineState,
            reduce_whitespace: !pipelineState.reduce_whitespace,
          })
        }
        title={i18n.translate(
          'xpack.enterpriseSearch.content.settings.whitespaceReduction.deploymentHeaderTitle',
          {
            defaultMessage: 'Deployment wide whitespace reduction',
          }
        )}
        value={reduceWhitespace}
      />
      <EuiSpacer size="s" />
      <SettingsPanel
        description={i18n.translate(
          'xpack.enterpriseSearch.content.settings.mlInference.description',
          {
            defaultMessage:
              'ML Inference Pipelines will run as part of your pipelines. You will have to configure processors for each index individually on its pipelines page.',
          }
        )}
        label={i18n.translate('xpack.enterpriseSearch.content.settings.mlInference.label', {
          defaultMessage: 'ML Inference',
        })}
        link={
          <EuiLink href={docLinks.mlDocumentEnrichment} target="_blank">
            {i18n.translate('xpack.enterpriseSearch.content.settings.mlInference.link', {
              defaultMessage: 'Learn more about document enrichment with ML',
            })}
          </EuiLink>
        }
        onChange={() =>
          setPipeline({
            ...pipelineState,
            run_ml_inference: !pipelineState.run_ml_inference,
          })
        }
        title={i18n.translate(
          'xpack.enterpriseSearch.content.settings.mlInference.deploymentHeaderTitle',
          {
            defaultMessage: 'Deployment wide ML Inference Pipelines extraction',
          }
        )}
        value={runMLInference}
      />
    </EnterpriseSearchContentPageTemplate>
  );
};
