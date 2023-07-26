/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import { ChatHeader } from '../../components/chat/chat_header';
import { ChatPromptEditor } from '../../components/chat/chat_prompt_editor';
import { ChatTimeline } from '../../components/chat/chat_timeline';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';

export function ConversationView() {
  const connectors = useGenAIConnectors();
  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <ChatHeader title="foo" connectors={connectors} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <ChatTimeline messages={[]} onEditMessage={() => {}} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ChatPromptEditor onSubmitPrompt={() => {}} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
