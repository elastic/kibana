/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import React from 'react';
import type { CaseSeverity } from '../../../common/api';
import { SeveritySelector } from './selector';
import { SEVERITY_TITLE } from './translations';

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (status: CaseSeverity) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const SeveritySidebarSelector: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
  isDisabled,
}) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiText>
        <h4>{SEVERITY_TITLE}</h4>
      </EuiText>
      <EuiHorizontalRule margin="xs" />
      <SeveritySelector
        isLoading={isLoading}
        selectedSeverity={selectedSeverity}
        onSeverityChange={onSeverityChange}
        isDisabled={isDisabled}
      />
    </EuiFlexItem>
  );
};
SeveritySidebarSelector.displayName = 'SeveritySidebarSelector';
