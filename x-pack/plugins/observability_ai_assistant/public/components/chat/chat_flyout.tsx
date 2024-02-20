/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { v4 } from 'uuid';
import { css } from '@emotion/css';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiPopover,
  EuiToolTip,
  useCurrentEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { ObservabilityAIAssistantMultipaneFlyoutProvider } from '../../context/observability_ai_assistant_multipane_flyout_provider';
import { useForceUpdate } from '../../hooks/use_force_update';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { ChatBody } from './chat_body';
import { ConversationList } from './conversation_list';
import { ChatInlineEditingContent } from './chat_inline_edit';
import type { Conversation, Message } from '../../../common/types';

const CONVERSATIONS_SIDEBAR_WIDTH = 260;
const CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED = 34;

const SIDEBAR_WIDTH = 400;

export type FlyoutWidthMode = 'side' | 'full';
export type FlyoutPositionMode = 'push' | 'overlay';

export function ChatFlyout({
  initialConversationId,
  initialTitle,
  initialMessages,
  initialFlyoutPositionMode,
  isOpen,
  startedFrom,
  onClose,
  onSelectConversation,
  onSetFlyoutPositionMode,
}: {
  initialConversationId?: string;
  initialTitle: string;
  initialMessages: Message[];
  initialFlyoutPositionMode?: FlyoutPositionMode;
  isOpen: boolean;
  startedFrom: StartedFrom;
  onClose: () => void;
  onSelectConversation?: (id: string) => void;
  onSetFlyoutPositionMode?: (mode: FlyoutPositionMode) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const breakpoint = useCurrentEuiBreakpoint();

  const currentUser = useCurrentUser();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  const [flyoutWidthMode, setFlyoutWidthMode] = useState<FlyoutWidthMode>('side');
  const [flyoutPositionMode, setFlyoutPositionMode] = useState<FlyoutPositionMode>(
    initialFlyoutPositionMode || 'overlay'
  );

  const [conversationsExpanded, setConversationsExpanded] = useState(false);

  const [secondSlotContainer, setSecondSlotContainer] = useState<HTMLDivElement | null>(null);
  const [isSecondSlotVisible, setIsSecondSlotVisible] = useState(false);

  const flyoutClassName = css`
    max-inline-size: 100% !important;
  `;

  const sidebarClass = css`
    max-width: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH
      : CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px;
    min-width: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH
      : CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px;
    border-right: solid 1px ${euiTheme.border.color};
  `;

  const expandButtonContainerClassName = css`
    position: absolute;
    margin-top: 16px;
    margin-left: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
      : 5}px;
    z-index: 1;
  `;

  const expandButtonClassName = css`
    color: ${euiTheme.colors.primary};
  `;

  const containerClassName = css`
    height: 100%;
    flex-wrap: nowrap;
  `;

  const chatBodyContainerClassName = css`
    min-width: 0;
  `;

  const hideClassName = css`
    display: none;
  `;

  const newChatButtonClassName = css`
    position: absolute;
    bottom: 31px;
    margin-left: ${conversationsExpanded
      ? CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
      : 5}px;
    z-index: 1;
  `;

  const chatBodyKeyRef = useRef(v4());
  const forceUpdate = useForceUpdate();
  const reloadConversation = useCallback(() => {
    chatBodyKeyRef.current = v4();
    forceUpdate();
  }, [forceUpdate]);

  const handleClickChat = (id: string) => {
    setConversationId(id);
    reloadConversation();
    onSelectConversation?.(id);
  };

  const handleConversationUpdate = ({
    conversation: { id },
  }: {
    conversation: Conversation['conversation'];
  }) => {
    setConversationId(id);
    onSelectConversation?.(id);
  };

  const handleClickDeleteConversation = () => {
    setConversationId(undefined);
    reloadConversation();
  };

  const handleClickNewChat = () => {
    if (conversationId) {
      setConversationId(undefined);
      reloadConversation();
    }
  };

  const handleToggleFlyoutWidthMode = (newFlyoutWidthMode: FlyoutWidthMode) => {
    setFlyoutWidthMode(newFlyoutWidthMode);
  };

  const handleToggleFlyoutPositionMode = (newFlyoutPositionMode: FlyoutPositionMode) => {
    setFlyoutPositionMode(newFlyoutPositionMode);
    onSetFlyoutPositionMode?.(newFlyoutPositionMode);
  };

  return isOpen ? (
    <ObservabilityAIAssistantMultipaneFlyoutProvider
      value={{
        container: secondSlotContainer,
        setVisibility: setIsSecondSlotVisible,
      }}
    >
      <EuiFlyoutResizable
        className={flyoutClassName}
        closeButtonProps={{
          css: {
            marginRight: breakpoint === 'xs' ? euiTheme.size.xs : euiTheme.size.s,
            marginTop: breakpoint === 'xs' ? euiTheme.size.xs : euiTheme.size.s,
          },
        }}
        paddingSize="m"
        pushAnimation
        minWidth={SIDEBAR_WIDTH}
        size={getFlyoutWidth({
          breakpoint,
          expanded: conversationsExpanded,
          flyoutWidthMode,
          isSecondSlotVisible,
        })}
        type={flyoutPositionMode}
        onClose={() => {
          onClose();
          setIsSecondSlotVisible(false);
          if (secondSlotContainer) {
            ReactDOM.unmountComponentAtNode(secondSlotContainer);
          }
        }}
      >
        <EuiFlexGroup gutterSize="none" className={containerClassName}>
          <EuiFlexItem className={breakpoint === 'xs' ? hideClassName : sidebarClass}>
            <EuiPopover
              anchorPosition="downLeft"
              className={expandButtonContainerClassName}
              button={
                <EuiToolTip
                  content={
                    conversationsExpanded
                      ? i18n.translate(
                          'xpack.observabilityAiAssistant.chatFlyout.euiToolTip.collapseConversationListLabel',
                          { defaultMessage: 'Collapse conversation list' }
                        )
                      : i18n.translate(
                          'xpack.observabilityAiAssistant.chatFlyout.euiToolTip.expandConversationListLabel',
                          { defaultMessage: 'Expand conversation list' }
                        )
                  }
                  display="block"
                >
                  <EuiButtonIcon
                    aria-label={i18n.translate(
                      'xpack.observabilityAiAssistant.chatFlyout.euiButtonIcon.expandConversationListLabel',
                      { defaultMessage: 'Expand conversation list' }
                    )}
                    className={expandButtonClassName}
                    color="text"
                    data-test-subj="observabilityAiAssistantChatFlyoutButton"
                    iconType={conversationsExpanded ? 'transitionLeftIn' : 'transitionLeftOut'}
                    onClick={() => setConversationsExpanded(!conversationsExpanded)}
                  />
                </EuiToolTip>
              }
            />

            {conversationsExpanded ? (
              <ConversationList
                selected={conversationId ?? ''}
                onClickDeleteConversation={handleClickDeleteConversation}
                onClickChat={handleClickChat}
                onClickNewChat={handleClickNewChat}
              />
            ) : (
              <EuiPopover
                anchorPosition="downLeft"
                button={
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.observabilityAiAssistant.chatFlyout.euiToolTip.newChatLabel',
                      { defaultMessage: 'New chat' }
                    )}
                    display="block"
                  >
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.observabilityAiAssistant.chatFlyout.euiButtonIcon.newChatLabel',
                        { defaultMessage: 'New chat' }
                      )}
                      data-test-subj="observabilityAiAssistantNewChatFlyoutButton"
                      iconType="plusInCircle"
                      onClick={handleClickNewChat}
                    />
                  </EuiToolTip>
                }
                className={newChatButtonClassName}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem className={chatBodyContainerClassName}>
            <ChatBody
              key={chatBodyKeyRef.current}
              connectors={connectors}
              currentUser={currentUser}
              flyoutWidthMode={flyoutWidthMode}
              flyoutPositionMode={flyoutPositionMode}
              initialTitle={initialTitle}
              initialMessages={initialMessages}
              initialConversationId={conversationId}
              knowledgeBase={knowledgeBase}
              showLinkToConversationsApp
              startedFrom={startedFrom}
              onConversationUpdate={handleConversationUpdate}
              onToggleFlyoutWidthMode={handleToggleFlyoutWidthMode}
              onToggleFlyoutPositionMode={handleToggleFlyoutPositionMode}
            />
          </EuiFlexItem>

          <EuiFlexItem
            style={{
              maxWidth: isSecondSlotVisible ? SIDEBAR_WIDTH : 0,
              paddingTop: '56px',
            }}
          >
            <ChatInlineEditingContent
              setContainer={setSecondSlotContainer}
              visible={isSecondSlotVisible}
              style={{
                borderTop: `solid 1px ${euiTheme.border.color}`,
                borderLeft: `solid 1px ${euiTheme.border.color}`,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutResizable>
    </ObservabilityAIAssistantMultipaneFlyoutProvider>
  ) : null;
}

const getFlyoutWidth = ({
  breakpoint,
  expanded,
  isSecondSlotVisible,
  flyoutWidthMode,
}: {
  breakpoint?: string;
  expanded: boolean;
  isSecondSlotVisible: boolean;
  flyoutWidthMode?: FlyoutWidthMode;
}) => {
  if (flyoutWidthMode === 'full') {
    return '100%';
  }
  if (breakpoint === 'xs') {
    return '90vw';
  }
  if (!expanded && !isSecondSlotVisible) {
    return '40vw';
  }
  if (expanded && !isSecondSlotVisible) {
    return `calc(40vw + ${CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px`;
  }
  if (!expanded && isSecondSlotVisible) {
    return `calc(40vw + ${SIDEBAR_WIDTH}px`;
  }

  return `calc(40vw + ${
    CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
  }px + ${SIDEBAR_WIDTH}px`;
};
