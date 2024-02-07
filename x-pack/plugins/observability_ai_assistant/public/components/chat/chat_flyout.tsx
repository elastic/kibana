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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFlyout, useEuiTheme } from '@elastic/eui';
import { useForceUpdate } from '../../hooks/use_force_update';
import { useCurrentUser } from '../../hooks/use_current_user';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKnowledgeBase } from '../../hooks/use_knowledge_base';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { ChatBody } from './chat_body';
import { ConversationList } from './conversation_list';
import type { Message } from '../../../common/types';
import { ChatInlineEditingContent } from './chat_inline_edit';

const CONVERSATIONS_SIDEBAR_WIDTH = 260;
const CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED = 34;

const SIDEBAR_WIDTH = 400;

export function ChatFlyout({
  initialTitle,
  initialMessages,
  onClose,
  isOpen,
  startedFrom,
}: {
  initialTitle: string;
  initialMessages: Message[];
  isOpen: boolean;
  startedFrom: StartedFrom;
  onClose: () => void;
}) {
  const { euiTheme } = useEuiTheme();

  const currentUser = useCurrentUser();

  const connectors = useGenAIConnectors();

  const knowledgeBase = useKnowledgeBase();

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const [expanded, setExpanded] = useState(false);
  const [secondSlotContainer, setSecondSlotContainer] = useState<HTMLDivElement | null>(null);
  const [isSecondSlotVisible, setIsSecondSlotVisible] = useState(false);

  const sidebarClass = css`
    max-width: ${expanded ? CONVERSATIONS_SIDEBAR_WIDTH : CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px;
    min-width: ${expanded ? CONVERSATIONS_SIDEBAR_WIDTH : CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED}px;
    border-right: solid 1px ${euiTheme.border.color};
  `;

  const expandButtonClassName = css`
    position: absolute;
    margin-top: 16px;
    margin-left: ${expanded
      ? CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
      : 5}px;
    padding: ${euiTheme.size.s};
    z-index: 1;
  `;

  const containerClassName = css`
    height: 100%;
  `;

  const chatBodyContainerClassName = css`
    min-width: 0;
  `;

  const newChatButtonClassName = css`
    position: absolute;
    bottom: 31px;
    margin-left: ${expanded
      ? CONVERSATIONS_SIDEBAR_WIDTH - CONVERSATIONS_SIDEBAR_WIDTH_COLLAPSED
      : 5}px;
    padding: ${euiTheme.size.s};
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

  return isOpen ? (
    <EuiFlyout
      closeButtonProps={{
        css: { marginRight: `${euiTheme.size.s}`, marginTop: `${euiTheme.size.s}` },
      }}
      size={getFlyoutWidth({ expanded, isSecondSlotVisible })}
      paddingSize="m"
      onClose={() => {
        onClose();
        setIsSecondSlotVisible(false);
        if (secondSlotContainer) {
          ReactDOM.unmountComponentAtNode(secondSlotContainer);
        }
      }}
    >
      <EuiFlexGroup gutterSize="none" className={containerClassName}>
        <EuiFlexItem className={sidebarClass}>
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistant.chatFlyout.euiButtonIcon.expandConversationListLabel',
              { defaultMessage: 'Expand conversation list' }
            )}
            className={expandButtonClassName}
            color="text"
            data-test-subj="observabilityAiAssistantChatFlyoutButton"
            iconType={expanded ? 'transitionLeftIn' : 'transitionLeftOut'}
            onClick={() => setExpanded(!expanded)}
          />

          {expanded ? (
            <ConversationList
              selected={conversationId ?? ''}
              onClickDeleteConversation={handleClickDeleteConversation}
              onClickChat={handleClickChat}
              onClickNewChat={handleClickNewChat}
            />
          ) : (
            <EuiButtonIcon
              aria-label={i18n.translate(
                'xpack.observabilityAiAssistant.chatFlyout.euiButtonIcon.newChatLabel',
                { defaultMessage: 'New chat' }
              )}
              className={newChatButtonClassName}
              data-test-subj="observabilityAiAssistantNewChatFlyoutButton"
              iconType="plusInCircle"
              onClick={handleClickNewChat}
            />
          )}
        </EuiFlexItem>

        <EuiFlexItem className={chatBodyContainerClassName}>
          <ChatBody
            key={chatBodyKeyRef.current}
            connectors={connectors}
            initialTitle={initialTitle}
            initialMessages={initialMessages}
            initialConversationId={conversationId}
            currentUser={currentUser}
            knowledgeBase={knowledgeBase}
            startedFrom={startedFrom}
            onConversationUpdate={(conversation) => {
              setConversationId(conversation.conversation.id);
            }}
            chatFlyoutSecondSlotHandler={{
              container: secondSlotContainer,
              setVisibility: setIsSecondSlotVisible,
            }}
            showLinkToConversationsApp
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
    </EuiFlyout>
  ) : null;
}

const getFlyoutWidth = ({
  expanded,
  isSecondSlotVisible,
}: {
  expanded: boolean;
  isSecondSlotVisible: boolean;
}) => {
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
