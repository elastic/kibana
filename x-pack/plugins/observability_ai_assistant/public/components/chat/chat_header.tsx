/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { AssistantAvatar } from '../assistant_avatar';

export function ChatHeader({ title }: { title: string }) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <AssistantAvatar size="m" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
