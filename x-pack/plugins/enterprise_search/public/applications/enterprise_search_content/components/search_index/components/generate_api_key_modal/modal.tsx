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
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

import { GenerateApiKeyLogic } from '../../../../api/generate_api_key/generate_api_key_logic';

export const GenerateApiKeyModal: React.FC = () => {
  const { data } = useValues(GenerateApiKeyLogic);
  const { makeRequest } = useActions(GenerateApiKeyLogic);

  console.log(data);
  return (
    <EuiModal onClose={() => {}}>
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
                    <EuiFormRow>
                      <EuiFieldText placeholder="Your API key will display here" disabled />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon display="base" iconType="copyClipboard" disabled />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon display="base" iconType="download" disabled />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconSide="left"
                      iconType="plusInCircle"
                      fill
                      onClick={() => {
                        makeRequest({ indexName: ".ds-logs-enterprise_search.api-default-2022.07.06-000001", keyName: "test1" });
                      }}
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
      <EuiModalFooter>Cancel</EuiModalFooter>
    </EuiModal>
  );
};
