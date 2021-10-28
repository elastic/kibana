/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React, { FC } from 'react';

interface Props {
  filter: Record<string, { label: string; formattedValue: string }>;
}

export const Filter: FC<Props> = ({ filter }) => {
  const fields = Object.values(filter).map((filterView, index) => (
    <EuiFlexItem key={`fields-${index}`}>
      <EuiText size="m">
        <strong>{filterView.label}</strong>
      </EuiText>
    </EuiFlexItem>
  ));

  const values = Object.values(filter).map((filterView, index) => (
    <EuiFlexItem key={`values-${index}`}>
      <EuiText>{filterView.formattedValue}</EuiText>
    </EuiFlexItem>
  ));

  return (
    <EuiPanel grow={false} hasShadow={false}>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="m">
            {fields}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m">
            {values}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
