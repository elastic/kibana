/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCard } from '@elastic/eui';

import * as i18n from '../../../common/translations';

interface ElserPromptProps {
  setIsInferenceFlyoutVisible: (value: boolean) => void;
}
export const ElserPrompt: React.FC<ElserPromptProps> = ({ setIsInferenceFlyoutVisible }) => (
  <EuiCard
    display="plain"
    hasBorder
    textAlign="left"
    data-test-subj="elserPromptForEmptyState"
    title={i18n.ELSER_TITLE}
    description={i18n.ELSER_DESCRIPTION}
    footer={
      <EuiButton iconType="plusInCircle" onClick={() => setIsInferenceFlyoutVisible(true)}>
        {i18n.ADD_ENDPOINT_LABEL}
      </EuiButton>
    }
  />
);
