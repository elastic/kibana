/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
} from '@elastic/eui';

import * as i18n from '../../../common/translations';

import inferenceEndpoint from '../../assets/images/inference_endpoint.svg';

import { EndpointPrompt } from './endpoint_prompt';

import './add_empty_prompt.scss';

interface AddEmptyPromptProps {
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const AddEmptyPrompt: React.FC<AddEmptyPromptProps> = ({ setIsInferenceFlyoutVisible }) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      layout="horizontal"
      restrictWidth
      color="plain"
      hasShadow
      icon={<EuiImage size="fullWidth" src={inferenceEndpoint} alt="" />}
      title={<h2>{i18n.INFERENCE_ENDPOINT_LABEL}</h2>}
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem data-test-subj="createFirstInferenceEndpointDescription">
            {i18n.CREATE_FIRST_INFERENCE_ENDPOINT_DESCRIPTION}
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
                {i18n.ADD_ENDPOINT_LABEL}
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      footer={
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <strong>{i18n.START_WITH_PREPARED_ENDPOINTS_LABEL}</strong>
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EndpointPrompt
                setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
                title={i18n.ELSER_TITLE}
                description={i18n.ELSER_DESCRIPTION}
                footer={
                  <EuiButton
                    iconType="plusInCircle"
                    onClick={() => setIsInferenceFlyoutVisible(true)}
                  >
                    {i18n.ADD_ENDPOINT_LABEL}
                  </EuiButton>
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EndpointPrompt
                setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
                title={i18n.E5_TITLE}
                description={i18n.E5_DESCRIPTION}
                footer={
                  <EuiButton
                    iconType="plusInCircle"
                    onClick={() => setIsInferenceFlyoutVisible(true)}
                  >
                    {i18n.ADD_ENDPOINT_LABEL}
                  </EuiButton>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      }
    />
  );
};
