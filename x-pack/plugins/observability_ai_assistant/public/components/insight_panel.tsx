/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { AssistantAvatar } from './assistant_avatar';

export interface InsightPanelProps {
  title: string;
}

export function InsightPanel({ title }: InsightPanelProps) {
  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup wrap responsive={false}>
        {/* expand / contract */}
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="arrowRight" />
        </EuiFlexItem>

        {/* content */}
        <EuiFlexItem>
          <EuiFlexGroup wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <AssistantAvatar size="xs" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h5>{title}</h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* actions */}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon iconType="boxesHorizontal" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
