/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiSuperSelect, EuiText } from '@elastic/eui';
import React from 'react';
import type { CaseSeverityWithAll } from '../../containers/types';
import { SeverityAll } from '../../containers/types';
import { severitiesWithAll } from '../severity/config';

interface Props {
  selectedSeverity: CaseSeverityWithAll;
  onSeverityChange: (status: CaseSeverityWithAll) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const SeverityFilter: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
  isDisabled,
}) => {
  const caseSeverities = Object.keys(severitiesWithAll) as CaseSeverityWithAll[];
  const options: Array<EuiSuperSelectOption<CaseSeverityWithAll>> = caseSeverities.map(
    (severity) => {
      const severityData = severitiesWithAll[severity];
      return {
        value: severity,
        inputDisplay: (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems={'center'}
            responsive={false}
            data-test-subj={`case-severity-filter-${severity}`}
          >
            <EuiFlexItem grow={false}>
              {severity === SeverityAll ? (
                <EuiText size="s">{severityData.label}</EuiText>
              ) : (
                <EuiHealth color={severityData.color}>{severityData.label}</EuiHealth>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }
  );

  return (
    <EuiSuperSelect
      disabled={isDisabled}
      fullWidth={true}
      isLoading={isLoading}
      options={options}
      valueOfSelected={selectedSeverity}
      onChange={onSeverityChange}
      data-test-subj="case-severity-filter"
    />
  );
};
SeverityFilter.displayName = 'SeverityFilter';
