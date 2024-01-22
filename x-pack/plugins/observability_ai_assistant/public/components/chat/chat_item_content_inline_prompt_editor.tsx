/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { noop } from 'lodash';
import { css } from '@emotion/css';
import { EuiPanel } from '@elastic/eui';
import { MessageText } from '../message_panel/message_text';
import { PromptEditor } from '../prompt_editor/prompt_editor';
import type { Message } from '../../../common';
import type { ChatActionClickHandler } from './types';
import type { TelemetryEventTypeWithPayload } from '../../analytics';

interface Props {
  editing: boolean;
  loading: boolean;
  role: Message['message']['role'];
  content: Message['message']['content'];
  functionCall: Message['message']['function_call'];
  onActionClick: ChatActionClickHandler;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onSubmit: (message: Message) => void;
}

const textContainerClassName = css`
  padding: 4px 0;
`;

const editorContainerClassName = css`
  padding: 12px 0;
`;

export function ChatItemContentInlinePromptEditor({
  editing,
  loading,
  functionCall,
  content,
  role,
  onActionClick,
  onSendTelemetry,
  onSubmit,
}: Props) {
  return !editing ? (
    <EuiPanel
      paddingSize="none"
      hasBorder={false}
      hasShadow={false}
      className={textContainerClassName}
    >
      <MessageText content={content || ''} loading={loading} onActionClick={onActionClick} />
    </EuiPanel>
  ) : (
    <EuiPanel
      paddingSize="none"
      hasBorder={false}
      hasShadow={false}
      className={editorContainerClassName}
    >
      <PromptEditor
        disabled={false}
        hidden={false}
        loading={false}
        initialFunctionCall={functionCall}
        initialContent={content}
        initialRole={role}
        onChangeHeight={noop}
        onSubmit={onSubmit}
        onSendTelemetry={onSendTelemetry}
      />
    </EuiPanel>
  );
}
