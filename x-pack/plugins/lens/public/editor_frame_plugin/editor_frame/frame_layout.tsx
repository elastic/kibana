/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RootDragDropProvider } from '../../drag_drop';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  return (
    <RootDragDropProvider>
      <EuiFlexGroup>
        {/* TODO style this and add workspace prop and loading flags */}
        <EuiFlexItem>{props.dataPanel}</EuiFlexItem>
        <EuiFlexItem>{props.workspacePanel}</EuiFlexItem>
        <EuiFlexItem>
          {props.configPanel}
          {props.suggestionsPanel}
        </EuiFlexItem>
      </EuiFlexGroup>
    </RootDragDropProvider>
  );
}
