/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSuperSelect,
  EuiSuperSelectOption,
} from '@elastic/eui';
import React from 'react';
import { CaseSeverity } from '../../../common/api';
import { severities } from './config';

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (status: CaseSeverity) => void;
  isLoading: boolean;
}

export const SeveritySelector: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
}) => {
  const caseSeverities = Object.keys(severities) as CaseSeverity[];
  const options: Array<EuiSuperSelectOption<CaseSeverity>> = caseSeverities.map((severity) => {
    const severityData = severities[severity];
    return {
      value: severity,
      inputDisplay: (
        <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={severityData.color}>{severityData.label}</EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': `case-severity-selection-${severity}`,
    };
  });

  return (
    <EuiSuperSelect
      fullWidth={true}
      isLoading={isLoading}
      options={options}
      valueOfSelected={selectedSeverity}
      onChange={onSeverityChange}
      data-test-subj="case-severity-selection"
    />
  );
};
SeveritySelector.displayName = 'SeveritySelector';
