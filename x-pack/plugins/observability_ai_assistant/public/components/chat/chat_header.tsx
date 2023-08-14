/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AssistantAvatar } from '../assistant_avatar';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { EMPTY_CONVERSATION_TITLE } from '../../i18n';
import { KnowledgeBaseCallout } from './knowledge_base_callout';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';

export function ChatHeader({
  title,
  loading,
  knowledgeBase,
  connectors,
  onSaveTitle,
}: {
  title: string;
  loading: boolean;
  knowledgeBase: UseKnowledgeBaseResult;
  connectors: UseGenAIConnectorsResult;
  onSaveTitle?: (title: string) => void;
}) {
  const hasTitle = !!title;

  const displayedTitle = title || EMPTY_CONVERSATION_TITLE;

  const theme = useEuiTheme();

  return (
    <EuiPanel
      paddingSize="s"
      hasBorder={false}
      hasShadow={false}
      borderRadius="none"
      className={css`
        padding-top: 16px;
        padding-bottom: 16px;
      `}
    >
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="m"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          {loading ? <EuiLoadingSpinner size="l" /> : <AssistantAvatar size="m" />}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem
              grow={false}
              className={css`
                width: 540px;
              `}
            >
              <EuiInlineEditTitle
                heading="h2"
                size="s"
                defaultValue={displayedTitle}
                className={css`
                  color: ${hasTitle
                    ? theme.euiTheme.colors.text
                    : theme.euiTheme.colors.subduedText};
                `}
                inputAriaLabel={i18n.translate(
                  'xpack.observabilityAiAssistant.chatHeader.editConversationInput',
                  { defaultMessage: 'Edit conversation' }
                )}
                isReadOnly={!Boolean(onSaveTitle)}
                onSave={onSaveTitle}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <KnowledgeBaseCallout knowledgeBase={knowledgeBase} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ConnectorSelectorBase {...connectors} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
