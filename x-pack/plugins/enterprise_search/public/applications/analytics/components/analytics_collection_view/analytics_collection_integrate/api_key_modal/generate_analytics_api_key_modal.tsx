/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

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
  EuiFormLabel,
  EuiCodeBlock,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { generateAnalyticsApiKeyLogic } from '../../../../api/generate_analytics_api_key/generate_analytics_api_key_logic';

import { GenerateApiKeyModalLogic } from './generate_analytics_api_key_modal.logic';

interface GenerateAnalyticsApiKeyModalProps {
  collectionName: string;
  onClose(): void;
}

export const GenerateAnalyticsApiKeyModal: React.FC<GenerateAnalyticsApiKeyModalProps> = ({
  collectionName,
  onClose,
}) => {
  const { keyName, apiKey, isLoading, isSuccess } = useValues(GenerateApiKeyModalLogic);
  const { setKeyName } = useActions(GenerateApiKeyModalLogic);
  const { makeRequest } = useActions(generateAnalyticsApiKeyLogic);

  useEffect(() => {
    setKeyName(`${collectionName} API key`);
  }, [collectionName]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.title',
            {
              defaultMessage: 'Create analytics API Key',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          <EuiPanel hasShadow={false} color="primary">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="flexEnd">
                  {!isSuccess ? (
                    <>
                      <EuiFlexItem>
                        <EuiFormRow label="Name your API key" fullWidth>
                          <EuiFieldText
                            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-editName"
                            fullWidth
                            placeholder="Type a name for your API key"
                            onChange={(event) => setKeyName(event.currentTarget.value)}
                            value={keyName}
                            isLoading={isLoading}
                          />
                        </EuiFormRow>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-generateApiKeyButton"
                          data-test-subj="generateApiKeyButton"
                          iconSide="left"
                          iconType="plusInCircle"
                          fill
                          onClick={() => {
                            makeRequest({
                              collectionName,
                              keyName: keyName.trim(),
                            });
                          }}
                          disabled={keyName.trim().length <= 0}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.generateButton',
                            {
                              defaultMessage: 'Generate key',
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
                            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-csvDownloadButton"
                            aria-label={i18n.translate(
                              'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.csvDownloadButton',
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
                          'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.apiKeyWarning',
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
        {apiKey ? (
          <EuiButton
            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-done"
            fill
            onClick={onClose}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.done',
              {
                defaultMessage: 'Done',
              }
            )}
          </EuiButton>
        ) : (
          <EuiButtonEmpty
            data-telemetry-id="entSearchContent-analyticss-api-generateAnalyticsApiKeyModal-cancel"
            onClick={onClose}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.analytics.api.generateAnalyticsApiKeyModal.cancel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
