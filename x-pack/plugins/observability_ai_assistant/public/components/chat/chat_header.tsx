/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { AssistantAvatar } from '../assistant_avatar';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';

export function ChatHeader({
  title,
  connectors,
}: {
  title: string;
  connectors: UseGenAIConnectorsResult;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="l">
      <EuiFlexItem grow={false}>
        <AssistantAvatar size="l" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectorSelectorBase {...connectors} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
