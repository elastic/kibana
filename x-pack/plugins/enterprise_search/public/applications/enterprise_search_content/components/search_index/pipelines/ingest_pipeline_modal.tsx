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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_PIPELINE_NAME } from '../../../../../../common/constants';

import { IngestPipelineParams } from '../../../../../../common/types/connectors';

import { CurlRequest } from '../components/curl_request/curl_request';

import { PipelineSettingsForm } from './pipeline_settings_form';

interface IngestPipelineModalProps {
  closeModal: () => void;
  createCustomPipelines: () => void;
  displayOnly: boolean;
  indexName: string;
  isGated: boolean;
  isLoading: boolean;
  pipeline: IngestPipelineParams;
  savePipeline: () => void;
  setPipeline: (pipeline: IngestPipelineParams) => void;
  showModal: boolean;
}

export const IngestPipelineModal: React.FC<IngestPipelineModalProps> = ({
  closeModal,
  createCustomPipelines,
  displayOnly,
  indexName,
  isGated,
  isLoading,
  pipeline,
  savePipeline,
  setPipeline,
  showModal,
}) => {
  const { name } = pipeline;

  // can't customize if you already have a custom pipeline!
  const canCustomize = name === DEFAULT_PIPELINE_NAME;

  return showModal ? (
    <EuiModal onClose={closeModal} maxWidth={'40rem'}>
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiModalHeaderTitle>
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.ingestModal.modalHeaderTitle',
                {
                  defaultMessage: 'Pipeline settings',
                }
              )}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued">
              <strong>{name}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {displayOnly ? (
                    <>
                      <p>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.content.index.pipelines.ingestModal.modalBodyAPIText"
                          defaultMessage="{apiIndex} Changes made to the settings below are for reference only. These settings will not be persisted to your index or pipeline."
                          values={{
                            apiIndex: (
                              <strong>
                                {i18n.translate(
                                  'xpack.enterpriseSearch.content.index.pipelines.ingestModal.apiIndex',
                                  { defaultMessage: 'This is an API-based index.' }
                                )}
                              </strong>
                            ),
                          }}
                        />
                      </p>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.index.pipelines.ingestModal.modalBodyAPITextCont',
                          {
                            defaultMessage:
                              "In order to use this pipeline on your API-based indices you'll need to explicitly reference it in your API requests.",
                          }
                        )}
                      </p>
                    </>
                  ) : (
                    i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.ingestModal.modalBodyConnectorText',
                      {
                        defaultMessage:
                          'This pipeline runs automatically on all Crawler and Connector indices created through Enterprise Search.',
                      }
                    )
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiSpacer />
              <EuiFlexItem>
                <EuiLink href="TODO TODO TODO: Insert actual docslink" external>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.ingestModal.modalIngestLinkLabel',
                    {
                      defaultMessage: 'Learn more about Enterprise Search ingest pipelines',
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
                <PipelineSettingsForm pipeline={pipeline} setPipeline={setPipeline} />
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
                      'xpack.enterpriseSearch.content.index.pipelines.ingestModal.curlHeader',
                      {
                        defaultMessage: 'Sample cURL request',
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
          {canCustomize && (
            <>
              <EuiSpacer />
              <EuiFlexItem>
                <EuiText color="subdued" size="s" grow={false}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.ingestModal.platinumText',
                    {
                      defaultMessage:
                        'With a platinum license, you can create an index-specific version of this configuration and modify it for your use case.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiSpacer />
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="flexStart">
                  <EuiButtonEmpty
                    disabled={isGated}
                    iconType={isGated ? 'lock' : undefined}
                    onClick={createCustomPipelines}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.ingestModal.copyButtonLabel',
                      { defaultMessage: 'Copy and customize' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        {displayOnly ? (
          <EuiButton fill onClick={closeModal}>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.ingestModal.closeButtonLabel',
              {
                defaultMessage: 'Close',
              }
            )}
          </EuiButton>
        ) : (
          <>
            <EuiButtonEmpty onClick={closeModal}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.ingestModal.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
            <EuiButton fill onClick={savePipeline} isLoading={isLoading}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.ingestModal.saveButtonLabel',
                {
                  defaultMessage: 'Save',
                }
              )}
            </EuiButton>
          </>
        )}
      </EuiModalFooter>
    </EuiModal>
  ) : (
    <></>
  );
};
