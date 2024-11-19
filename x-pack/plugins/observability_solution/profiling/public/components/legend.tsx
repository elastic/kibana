/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';

export interface LegendItem {
  color: string;
  label: string;
}

export function Legend({ legendItems }: { legendItems: LegendItem[] }) {
  return (
    <EuiFlexGroup direction="row" gutterSize="m">
      {legendItems.map(({ color, label }) => {
        return (
          <EuiFlexItem key={label} grow={false}>
            <EuiFlexGroup direction="row" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiIcon type="dot" color={color} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
