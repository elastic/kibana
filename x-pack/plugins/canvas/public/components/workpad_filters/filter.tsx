/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import React, { FC } from 'react';

interface Props {
  filter: Record<string, string>;
}

export const Filter: FC<Props> = ({ filter }) => {
  const fields = Object.keys(filter).map((name, index) => (
    <EuiFlexItem key={`fields-${index}`}>
      <EuiText size="m">
        <strong>{name}</strong>
      </EuiText>
    </EuiFlexItem>
  ));

  const values = Object.values(filter).map((value, index) => (
    <EuiFlexItem key={`fields-${index}`}>
      <EuiText>{value}</EuiText>
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
