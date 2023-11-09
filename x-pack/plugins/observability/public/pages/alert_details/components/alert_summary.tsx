/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiText, EuiFlexItem, EuiFlexGrid, useIsWithinBreakpoints } from '@elastic/eui';

export interface AlertSummaryField {
  label: ReactNode | string;
  value: ReactNode | string | number;
}
interface AlertSummaryProps {
  alertSummaryFields?: AlertSummaryField[];
}

export function AlertSummary({ alertSummaryFields }: AlertSummaryProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  return (
    <EuiFlexGrid
      responsive={false}
      data-test-subj="alert-summary-container"
      style={{
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
      }}
    >
      {alertSummaryFields?.map((field, idx) => {
        return (
          <EuiFlexItem key={idx}>
            <EuiText color="subdued">{field.label}</EuiText>
            <EuiText>{field.value}</EuiText>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
}
