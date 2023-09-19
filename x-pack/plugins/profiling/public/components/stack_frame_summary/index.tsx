/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import React from 'react';
import { getCalleeFunction, getCalleeSource } from '@kbn/profiling-utils';
import type { StackFrameMetadata } from '@kbn/profiling-utils';

interface Props {
  frame: StackFrameMetadata;
  onFrameClick?: (functionName: string) => void;
}

function CalleeFunctionText({ calleeFunctionName }: { calleeFunctionName: string }) {
  return (
    <EuiText size="s" style={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}>
      {calleeFunctionName}
    </EuiText>
  );
}

export function StackFrameSummary({ frame, onFrameClick }: Props) {
  const calleeFunctionName = getCalleeFunction(frame);

  function handleOnClick() {
    if (onFrameClick) {
      onFrameClick(calleeFunctionName);
    }
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <div>
          {onFrameClick ? (
            <EuiLink data-test-subj="profilingStackFrameSummaryLink" onClick={handleOnClick}>
              <CalleeFunctionText calleeFunctionName={calleeFunctionName} />
            </EuiLink>
          ) : (
            <CalleeFunctionText calleeFunctionName={calleeFunctionName} />
          )}
        </div>
      </EuiFlexItem>
      <EuiFlexItem style={{ overflowWrap: 'anywhere' }}>
        <EuiText size="s">{getCalleeSource(frame) || '‎'}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
