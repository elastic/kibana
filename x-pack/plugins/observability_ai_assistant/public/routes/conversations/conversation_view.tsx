/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { ChatHeader } from '../../components/chat/chat_header';

export function ConversationView() {
  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <ChatHeader title="foo" />
          </EuiFlexItem>
          <EuiFlexItem grow />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
