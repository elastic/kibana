/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCard } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface MultilingualE5PromptProps {
  addEndpointLabel: string;
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const MultilingualE5Prompt: React.FC<MultilingualE5PromptProps> = ({
  addEndpointLabel,
  setIsInferenceFlyoutVisible,
}) => (
  <EuiCard
    display="plain"
    hasBorder
    textAlign="left"
    data-test-subj="multilingualE5PromptForEmptyState"
    description={i18n.translate(
      'xpack.searchInferenceEndpoints.inferenceEndpoints.addEmptyPrompt.e5Description',
      {
        defaultMessage:
          'E5 is a dense vector NLP model that enables you to perform multi-lingual semantic search.',
      }
    )}
    title={i18n.translate(
      'xpack.searchInferenceEndpoints.inferenceEndpoints.addEmptyPrompt.e5Title',
      {
        defaultMessage: 'Multilingual E5',
      }
    )}
    footer={
      <EuiButton iconType="plusInCircle" onClick={() => setIsInferenceFlyoutVisible(true)}>
        {addEndpointLabel}
      </EuiButton>
    }
  />
);
