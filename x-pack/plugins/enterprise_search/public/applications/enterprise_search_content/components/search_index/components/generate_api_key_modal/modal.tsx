/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiCopy,
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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

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
        <EuiModalHeaderTitle>Generate API Key</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          <EuiText size="m">
            <p>
              Before you can start posting documents to your Elasticsearch index you'll need to
              create at least one API key.&nbsp;
              <EuiLink href={/* TODO link to docs */ '#'} external>
                Learn more about API keys
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiPanel hasShadow={false} color="primary">
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup direction="row" alignItems="center">
                  <EuiFlexItem>
                    {!isSuccess ? (
                      <EuiFormRow label="Name your API key">
                        <EuiFieldText
                          placeholder="Type a name for your API key"
                          onChange={(event) => setKeyName(event.currentTarget.value)}
                          isLoading={isLoading}
                        />
                      </EuiFormRow>
                    ) : (
                      <EuiFormRow label={`"${keyName.trim()}"`}>
                        <EuiFieldText value={apiKey} />
                      </EuiFormRow>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy
                      textToCopy={apiKey}
                      beforeMessage={i18n.translate(
                        'xpack.enterpriseSearch.content.overview.generateApiKeyModal.copyToClipboard',
                        { defaultMessage: 'Copy to clipboard' }
                      )}
                      afterMessage={i18n.translate(
                        'xpack.enterpriseSearch.content.overview.generateApiKeyModal.copiedToClipboard',
                        { defaultMessage: 'Copied Client ID to clipboard' }
                      )}
                    >
                      {(copy) => (
                        <EuiButtonIcon
                          display="fill"
                          iconType="copyClipboard"
                          disabled={!isSuccess}
                          onClick={copy}
                        />
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      display="fill"
                      iconType="download"
                      href={encodeURI(`data:text/csv;charset=utf-8,${apiKey}`)}
                      download={`${keyName}.csv`}
                      disabled={!isSuccess}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconSide="left"
                      iconType="plusInCircle"
                      fill
                      onClick={() => {
                        makeRequest({
                          indexName,
                          keyName: keyName.trim(),
                        });
                      }}
                      disabled={keyName.trim().length <= 0 || isSuccess}
                    >
                      Generate API Key
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiText size="s" color="#006bb8">
                      <p>
                        Elastic does not store API keys. Once generated, you'll only be able to view
                        the key one time. Make sure you save it somewhere secure. If you lose access
                        to it you'll need to generate a new API key from this screen.
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
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
