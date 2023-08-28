/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import React from 'react';

interface Props {
  'data-test-subj'?: string;
  rows: Array<{
    label: string | React.ReactNode;
    value: React.ReactNode;
    'data-test-subj'?: string;
  }>;
  prependString?: string;
}

export function KeyValueList({ rows, prependString = '', ...props }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {rows.map((row, index) => (
        <React.Fragment key={index}>
          <EuiFlexItem>
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow style={{ display: 'flex', flexDirection: 'row' }}>
                {row.label}:
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                style={{ alignSelf: 'flex-end', overflowWrap: 'anywhere' }}
                data-test-subj={`${props['data-test-subj']}_${row['data-test-subj']}`}
              >
                {prependString}
                {row.value}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {index < rows.length - 1 ? (
            <EuiFlexItem>
              <EuiHorizontalRule size="full" margin="none" />
            </EuiFlexItem>
          ) : undefined}
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
}
