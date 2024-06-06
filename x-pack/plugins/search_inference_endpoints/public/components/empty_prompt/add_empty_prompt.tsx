/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import inferenceEndpoint from '../../assets/images/inference_endpoint.svg';

import { ElserPrompt } from './elser_prompt';
import { MultilingualE5Prompt } from './multilingual_e5_prompt';

import './add_empty_prompt.scss';

interface AddEmptyPromptProps {
  addEndpointLabel: string;
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const AddEmptyPrompt: React.FC<AddEmptyPromptProps> = ({
  addEndpointLabel,
  setIsInferenceFlyoutVisible,
}) => {
  return (
    <EuiEmptyPrompt
      className="addEmptyPrompt"
      layout="horizontal"
      title={
        <h2>
          <FormattedMessage
            id="xpack.searchInferenceEndpoints.inferenceEndpoints.addEmptyPrompt.h2.createFirstInferenceEndpointLabel"
            defaultMessage="Inference Endpoints"
          />
        </h2>
      }
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem data-test-subj="createFirstInferenceEndpointDescription">
            {i18n.translate(
              'xpack.searchInferenceEndpoints.inferenceEndpoints.addEmptyPrompt.createFirstInferenceEndpointDescription',
              {
                defaultMessage:
                  'Connect to your third-party model provider to create an inference endpoint for semantic search.',
              }
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <EuiButton
                color="primary"
                fill
                iconType="plusInCircle"
                data-test-subj="addEndpointButtonForEmptyPrompt"
                onClick={() => setIsInferenceFlyoutVisible(true)}
              >
                {addEndpointLabel}
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      footer={
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <strong>
              {i18n.translate(
                'xpack.searchInferenceEndpoints.inferenceEndpoints.addEmptyPrompt.startWithPreparedEndpointsLabel',
                {
                  defaultMessage: 'Get started quickly with our prepared endpoints:',
                }
              )}
            </strong>
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <ElserPrompt
                addEndpointLabel={addEndpointLabel}
                setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MultilingualE5Prompt
                addEndpointLabel={addEndpointLabel}
                setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      }
      color="plain"
      hasBorder
      icon={<EuiImage size="fullWidth" src={inferenceEndpoint} alt="" />}
    />
  );
};
