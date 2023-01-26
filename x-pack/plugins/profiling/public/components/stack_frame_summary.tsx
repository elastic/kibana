/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { getCalleeFunction, getCalleeSource, StackFrameMetadata } from '../../common/profiling';

export function StackFrameSummary({ frame }: { frame: StackFrameMetadata }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <div>
          <EuiText size="s" style={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}>
            {getCalleeFunction(frame)}
          </EuiText>
        </div>
      </EuiFlexItem>
      <EuiFlexItem style={{ overflowWrap: 'anywhere' }}>
        <EuiText size="s">{getCalleeSource(frame) || '‎'}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
