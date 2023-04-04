/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import React from 'react';

interface Props {
  rows: Array<{ label: string; value: React.ReactNode }>;
}

export function KeyValueList({ rows }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {rows.map((row, index) => (
        <>
          <EuiFlexItem>
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow>{row.label}:</EuiFlexItem>
              <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end', overflowWrap: 'anywhere' }}>
                {row.value}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {index < rows.length - 1 ? (
            <EuiFlexItem>
              <EuiHorizontalRule size="full" margin="none" />
            </EuiFlexItem>
          ) : undefined}
        </>
      ))}
    </EuiFlexGroup>
  );
}
