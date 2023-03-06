/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

export interface Props {
  title: string;
  subtitle: string;
}

export function OverviewItem({ title, subtitle }: Props) {
  return (
    <EuiFlexItem grow={true}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>{title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{subtitle}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
