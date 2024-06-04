/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageTemplate } from '@elastic/eui';
import { AddEmptyPrompt } from './empty_prompt/add_empty_prompt';
import { InferenceEndpointsProvider } from '../providers/inference_endpoints_provider';

interface EmptyPromptPageProps {
  addEndpointLabel: string;
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const EmptyPromptPage: React.FC<EmptyPromptPageProps> = ({
  addEndpointLabel,
  setIsInferenceFlyoutVisible,
}) => (
  <InferenceEndpointsProvider>
    <EuiPageTemplate offset={0} restrictWidth={false} grow={false}>
      <AddEmptyPrompt
        addEndpointLabel={addEndpointLabel}
        setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
      />
    </EuiPageTemplate>
  </InferenceEndpointsProvider>
);
