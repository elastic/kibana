/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AddEmptyPrompt } from './empty_prompt/add_empty_prompt';

interface EmptyPromptPageProps {
  addEndpointLabel: string;
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const EmptyPromptPage: React.FC<EmptyPromptPageProps> = ({
  addEndpointLabel,
  setIsInferenceFlyoutVisible,
}) => (
  <AddEmptyPrompt
    addEndpointLabel={addEndpointLabel}
    setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
  />
);
