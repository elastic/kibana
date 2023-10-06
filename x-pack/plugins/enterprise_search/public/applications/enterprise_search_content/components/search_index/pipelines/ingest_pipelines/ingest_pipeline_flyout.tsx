/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { IngestPipelineParams } from '@kbn/search-connectors';

import { docLinks } from '../../../../../shared/doc_links';

import { CurlRequest } from '../../components/curl_request/curl_request';

import { PipelineSettingsForm } from '../pipeline_settings_form';

interface IngestPipelineFlyoutProps {
  closeFlyout: () => void;
  displayOnly: boolean;
  extractionDisabled: boolean;
  indexName: string;
  ingestionMethod: string;
  isLoading: boolean;
  pipeline: IngestPipelineParams;
  savePipeline: () => void;
  setPipeline: (pipeline: IngestPipelineParams) => void;
}

export const IngestPipelineFlyout: React.FC<IngestPipelineFlyoutProps> = ({
  closeFlyout,
  displayOnly,
  extractionDisabled,
  indexName,
  ingestionMethod,
  isLoading,
  pipeline,
  savePipeline,
  setPipeline,
}) => {
  const { name } = pipeline;

  return (
    <EuiFlyout onClose={closeFlyout} maxWidth={'40rem'}>
      <EuiFlyoutHeader>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiTitle>
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.modalHeaderTitle',
                  {
                    defaultMessage: 'Pipeline settings',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <strong>{name}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            {extractionDisabled ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.settings.extractBinaryDisabledWarningTitle',
                  {
                    defaultMessage: 'Content extraction cannot be configured',
                  }
                )}
                color="warning"
                iconType="warning"
              >
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.settings.extractBinaryDisabledWarningContent',
                    {
                      defaultMessage:
                        'Because local content extraction is enabled for this connector, pipeline content extraction settings cannot be used.',
                    }
                  )}
                </p>
                <EuiLink
                  href={`${docLinks.connectorsContentExtraction}#connectors-content-extraction-local`}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.modalIngestLinkLocalExtractionLabel',
                    {
                      defaultMessage: 'Learn more about local content extraction.',
                    }
                  )}
                </EuiLink>
              </EuiCallOut>
            ) : (
              <></>
            )}
          </EuiFlexItem>
          <EuiSpacer size="xl" />
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {displayOnly ? (
                    <>
                      <p>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.modalBodyAPIText"
                          defaultMessage="{apiIndex} Changes made to the settings below are for reference only. These settings will not be persisted to your index or pipeline."
                          values={{
                            apiIndex: (
                              <strong>
                                {i18n.translate(
                                  'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.apiIndex',
                                  { defaultMessage: 'This is an API-based index.' }
                                )}
                              </strong>
                            ),
                          }}
                        />
                      </p>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.modalBodyAPITextCont',
                          {
                            defaultMessage:
                              "In order to use this pipeline on your API-based indices you'll need to explicitly reference it in your API requests.",
                          }
                        )}
                      </p>
                    </>
                  ) : (
                    i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.modalBodyConnectorText',
                      {
                        defaultMessage:
                          'This pipeline runs automatically on all Crawler and Connector indices created through Search.',
                      }
                    )
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiSpacer />
              <EuiFlexItem>
                <EuiLink href={docLinks.ingestPipelines} external>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.modalIngestLinkLabel',
                    {
                      defaultMessage: 'Learn more about Search ingest pipelines',
                    }
                  )}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiSpacer size="xl" />
          <EuiFlexItem>
            <EuiForm aria-labelledby="ingestPipelineHeader">
              <EuiFormRow fullWidth>
                <EuiText size="m" id="ingestPipelineHeader">
                  <strong>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.settings.formHeader',
                      {
                        defaultMessage: 'Optimize your content for search',
                      }
                    )}
                  </strong>
                </EuiText>
              </EuiFormRow>
              <EuiFormRow fullWidth>
                <PipelineSettingsForm
                  extractionDisabled={extractionDisabled}
                  ingestionMethod={ingestionMethod}
                  pipeline={pipeline}
                  setPipeline={setPipeline}
                />
              </EuiFormRow>
            </EuiForm>
            <EuiSpacer />
          </EuiFlexItem>
          {displayOnly && (
            <>
              <EuiSpacer size="xl" />
              <EuiFlexItem grow={false}>
                <EuiText size="m" id="ingestPipelineHeader" grow={false}>
                  <strong>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.curlHeader',
                      {
                        defaultMessage: 'Sample cURL request to ingest a document',
                      }
                    )}
                  </strong>
                </EuiText>
                <EuiSpacer />
                <CurlRequest
                  document={{ body: 'body', title: 'Title' }}
                  indexName={indexName}
                  pipeline={pipeline}
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {displayOnly ? (
          <EuiButton fill onClick={closeFlyout}>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.closeButtonLabel',
              {
                defaultMessage: 'Close',
              }
            )}
          </EuiButton>
        ) : (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={closeFlyout}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.cancelButtonLabel',
                  {
                    defaultMessage: 'Cancel',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={savePipeline} isLoading={isLoading}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.saveButtonLabel',
                  {
                    defaultMessage: 'Save',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
