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

import { GenerateEngineApiKeyLogic } from '../../../../api/generate_engine_api_key/generate_engine_api_key_logic';

import { GenerateApiKeyModalLogic } from './generate_engine_api_key_modal.logic';

interface GenerateEngineApiKeyModalProps {
  engineName: string;
  onClose(): void;
}

export const GenerateEngineApiKeyModal: React.FC<GenerateEngineApiKeyModalProps> = ({
  engineName,
  onClose,
}) => {
  const { keyName, apiKey, isLoading, isSuccess } = useValues(GenerateApiKeyModalLogic);
  const { setKeyName } = useActions(GenerateApiKeyModalLogic);
  const { makeRequest } = useActions(GenerateEngineApiKeyLogic);

  useEffect(() => {
    setKeyName(`${engineName} read-only API key`);
  }, [engineName]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'xpack.enterpriseSearch.content.engine.api.generateEngineApiKeyModal.title',
            {
              defaultMessage: 'Create Engine read-only API key',
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
                            data-telemetry-id={`entSearchContent-engines-api-generateEngineApiKeyModal-editName`}
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
                          data-telemetry-id={`entSearchContent-engines-api-generateEngineApiKeyModal-generateApiKeyButton`}
                          data-test-subj="generateApiKeyButton"
                          iconSide="left"
                          iconType="plusInCircle"
                          fill
                          onClick={() => {
                            makeRequest({
                              engineName,
                              keyName: keyName.trim(),
                            });
                          }}
                          disabled={keyName.trim().length <= 0}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.engine.api.generateEngineApiKeyModal.generateButton',
                            {
                              defaultMessage: 'Generate Read only key',
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
                            data-telemetry-id={`entSearchContent-engines-api-generateEngineApiKeyModal-csvDownloadButton`}
                            aria-label={i18n.translate(
                              'xpack.enterpriseSearch.content.engine.api.generateEngineApiKeyModal.csvDownloadButton',
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
                          'xpack.enterpriseSearch.content.engine.api.generateEngineApiKeyModal.apiKeyWarning',
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
            data-telemetry-id={`entSearchContent-engines-api-generateEngineApiKeyModal-done`}
            fill
            onClick={onClose}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.engine.api.generateEngineApiKeyModal.done',
              {
                defaultMessage: 'Done',
              }
            )}
          </EuiButton>
        ) : (
          <EuiButtonEmpty
            data-telemetry-id={`entSearchContent-engines-api-generateEngineApiKeyModal-cancel`}
            onClick={onClose}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.engine.api.generateEngineApiKeyModal.cancel',
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
