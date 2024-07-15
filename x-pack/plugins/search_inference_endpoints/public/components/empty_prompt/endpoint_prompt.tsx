/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard } from '@elastic/eui';

interface EndpointPromptProps {
  setIsInferenceFlyoutVisible: (value: boolean) => void;
  title: string;
  description: string;
  footer: React.ReactElement;
}

export const EndpointPrompt: React.FC<EndpointPromptProps> = ({
  setIsInferenceFlyoutVisible,
  title,
  description,
  footer,
}) => (
  <EuiCard
    display="plain"
    textAlign="left"
    data-test-subj="multilingualE5PromptForEmptyState"
    title={title}
    titleSize="xs"
    description={description}
    footer={footer}
  />
);
