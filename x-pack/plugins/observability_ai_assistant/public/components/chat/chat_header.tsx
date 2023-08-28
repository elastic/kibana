/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef } from 'react';
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
import { EMPTY_CONVERSATION_TITLE, UPGRADE_LICENSE_TITLE } from '../../i18n';
import { KnowledgeBaseCallout } from './knowledge_base_callout';
import { TechnicalPreviewBadge } from '../technical_preview_badge';
import { useUnmountAndRemountWhenPropChanges } from '../../hooks/use_unmount_and_remount_when_prop_changes';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';

const minWidthClassName = css`
  min-width: 0;
`;

export function ChatHeader({
  title,
  loading,
  disabled,
  connectors,
  knowledgeBase,
  onSaveTitle,
}: {
  title: string;
  loading: boolean;
  disabled: boolean;
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  onSaveTitle?: (title: string) => void;
}) {
  const hasTitle = !!title;

  const displayedTitle = disabled ? UPGRADE_LICENSE_TITLE : title || EMPTY_CONVERSATION_TITLE;

  const theme = useEuiTheme();

  // Component only works uncontrolled at the moment, so need to unmount and remount on prop change.
  // https://github.com/elastic/eui/issues/7084
  const shouldRender = useUnmountAndRemountWhenPropChanges(displayedTitle);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false} borderRadius="none">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          {loading ? <EuiLoadingSpinner size="xl" /> : <AssistantAvatar size="s" />}
        </EuiFlexItem>
        <EuiFlexItem grow className={minWidthClassName}>
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            className={minWidthClassName}
            justifyContent="center"
          >
            <EuiFlexItem grow={false} className={minWidthClassName}>
              <EuiFlexGroup
                direction="row"
                gutterSize="m"
                className={minWidthClassName}
                alignItems="center"
              >
                <EuiFlexItem grow className={minWidthClassName}>
                  {shouldRender ? (
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
                      editModeProps={{ inputProps: { inputRef } }}
                      isReadOnly={disabled || !Boolean(onSaveTitle)}
                      onSave={onSaveTitle}
                    />
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false} className={minWidthClassName}>
                  <ConnectorSelectorBase {...connectors} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <TechnicalPreviewBadge />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              {!disabled ? <KnowledgeBaseCallout knowledgeBase={knowledgeBase} /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
