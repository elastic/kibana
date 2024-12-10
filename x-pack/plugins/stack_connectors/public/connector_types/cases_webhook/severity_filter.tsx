/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiSuperSelectOption } from '@elastic/eui';
import { severities, SeverityHealth } from '@kbn/cases-plugin/public/components/severity/config';

export enum CaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (status: CaseSeverity) => void;
}

export const SeverityFilter: React.FC<Props> = ({ selectedSeverity, onSeverityChange }) => {
  const caseSeverities = Object.keys(severities) as CaseSeverity[];
  const options: Array<EuiSuperSelectOption<CaseSeverity>> = caseSeverities.map((severity) => {
    const severityData = severities[severity];
    return {
      value: severity,
      inputDisplay: (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems={'center'}
          responsive={false}
          data-test-subj={`case-severity-selection-${severity}`}
        >
          <EuiFlexItem grow={false}>
            <SeverityHealth severity={severity} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  });

  return (
    <EuiSuperSelect
      fullWidth={true}
      options={options}
      valueOfSelected={selectedSeverity}
      onChange={onSeverityChange}
      data-test-subj="case-severity-selection"
    />
  );
};
SeverityFilter.displayName = 'SeverityFilter';
