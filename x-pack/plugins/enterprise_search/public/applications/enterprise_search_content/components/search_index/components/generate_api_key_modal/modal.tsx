/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiFormLabel,
  EuiCodeBlock,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../../shared/doc_links';

import { GenerateApiKeyModalLogic } from './generate_api_key_modal.logic';

interface GenerateApiKeyModalProps {
  indexName: string;
  onClose(): void;
}

export const GenerateApiKeyModal: React.FC<GenerateApiKeyModalProps> = ({ indexName, onClose }) => {
  const { keyName, apiKey, isLoading, isSuccess } = useValues(GenerateApiKeyModalLogic);
  const { setKeyName, makeRequest } = useActions(GenerateApiKeyModalLogic);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.enterpriseSearch.content.overview.generateApiKeyModal.title', {
            defaultMessage: 'Generate API Key',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          <EuiText size="m">
            <p>
              {i18n.translate('xpack.enterpriseSearch.content.overview.generateApiKeyModal.info', {
                defaultMessage:
                  "Before you can start posting documents to your Elasticsearch index you'll need to create at least one API key.",
              })}
              &nbsp;
              <EuiLink href={docLinks.apiKeys} external>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.overview.generateApiKeyModal.learnMore',
                  { defaultMessage: 'Learn more about API keys' }
                )}
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiPanel hasShadow={false} color="primary">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="flexEnd">
                  {!isSuccess ? (
                    <>
                      <EuiFlexItem>
                        <EuiFormRow label="Name your API key" fullWidth>
                          <EuiFieldText
                            fullWidth
                            placeholder="Type a name for your API key"
                            onChange={(event) => setKeyName(event.currentTarget.value)}
                            isLoading={isLoading}
                          />
                        </EuiFormRow>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="generateApiKeyButton"
                          iconSide="left"
                          iconType="plusInCircle"
                          fill
                          onClick={() => {
                            makeRequest({
                              indexName,
                              keyName: keyName.trim(),
                            });
                          }}
                          disabled={keyName.trim().length <= 0}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.overview.generateApiKeyModal.generateButton',
                            {
                              defaultMessage: 'Generate API key',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    </>
                  ) : (
                    <EuiFlexItem>
                      <EuiFormLabel>{keyName}</EuiFormLabel>
                      <EuiSpacer size="xs" />
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem>
                          <EuiCodeBlock
                            aria-label={keyName}
                            fontSize="m"
                            paddingSize="m"
                            color="dark"
                            isCopyable
                          >
                            {apiKey}
                          </EuiCodeBlock>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.enterpriseSearch.content.overview.generateApiKeyModal.csvDownloadButton',
                              { defaultMessage: 'Download API key' }
                            )}
                            iconType="download"
                            href={encodeURI(`data:text/csv;charset=utf-8,${apiKey}`)}
                            download={`${keyName}.csv`}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="s" color="#006bb8">
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.overview.generateApiKeyModal.apiKeyWarning',
                          {
                            defaultMessage:
                              "Elastic does not store API keys. Once generated, you'll only be able to view the key one time. Make sure you save it somewhere secure. If you lose access to it you'll need to generate a new API key from this screen.",
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('xpack.enterpriseSearch.content.overview.generateApiKeyModal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
