/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCard } from '@elastic/eui';

import * as i18n from '../../../common/translations';

interface MultilingualE5PromptProps {
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}

export const MultilingualE5Prompt: React.FC<MultilingualE5PromptProps> = ({
  setIsInferenceFlyoutVisible,
}) => (
  <EuiCard
    display="plain"
    hasBorder
    textAlign="left"
    data-test-subj="multilingualE5PromptForEmptyState"
    title={i18n.E5_TITLE}
    description={i18n.E5_DESCRIPTION}
    footer={
      <EuiButton iconType="plusInCircle" onClick={() => setIsInferenceFlyoutVisible(true)}>
        {i18n.ADD_ENDPOINT_LABEL}
      </EuiButton>
    }
  />
);
