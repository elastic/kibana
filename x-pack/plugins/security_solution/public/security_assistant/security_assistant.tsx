/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiCopy,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiCommentList,
  EuiAvatar,
  EuiPageHeader,
  EuiMarkdownFormat,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';
import styled from 'styled-components';
import * as i18n from './translations';

import { useKibana } from '../common/lib/kibana';
import { getCombinedMessage, getMessageFromRawResponse, isFileHash } from './helpers';
import { SendToTimelineButton } from './send_to_timeline_button';
import { SettingsPopover } from './settings_popover';
import { useSecurityAssistantContext } from './security_assistant_context';
import { ContextPills } from './context_pills';
import { PromptTextArea } from './prompt_textarea';
import type { PromptContext } from './prompt_context/types';
import { useConversation } from './use_conversation';
import { useSendMessages } from './use_send_messages';
import type { Message } from './security_assistant_context/types';
import { ConversationSelector } from './conversation_selector';
import { FirstPromptEditor } from './first_prompt_editor';
import { getDefaultSystemPrompt, getSuperheroPrompt } from './prompt/helpers';
import type { Prompt } from './types';
import { getPromptById } from './first_prompt_editor/helpers';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const CommentsContainer = styled.div`
  max-height: 600px;
  overflow-y: scroll;
`;

const ChatOptionsFlexItem = styled(EuiFlexItem)`
  left: -44px;
  position: relative;
  top: 11px;
`;

const ChatContainerFlexGroup = styled(EuiFlexGroup)`
  width: 103%;
`;

const StyledCommentList = styled(EuiCommentList)`
  margin-right: 20px;
`;

export interface SecurityAssistantProps {
  promptContextId?: string;
  conversationId?: string;
  showTitle?: boolean;
  shouldRefocusPrompt?: boolean;
}

/**
 * Security Assistant component that renders a chat window with a prompt input and a chat history,
 * along with quick prompts for common actions, settings, and prompt context providers.
 */
export const SecurityAssistant: React.FC<SecurityAssistantProps> =
  React.memo<SecurityAssistantProps>(
    ({
      promptContextId = '',
      showTitle = true,
      conversationId = 'default',
      shouldRefocusPrompt = false,
    }) => {
      const { promptContexts, conversations } = useSecurityAssistantContext();
      const [selectedPromptContextIds, setSelectedPromptContextIds] = useState<string[]>([]);

      const { appendMessage, clearConversation, createConversation } = useConversation();
      const { isLoading, sendMessages } = useSendMessages();

      const [selectedConversationId, setSelectedConversationId] = useState<string>(conversationId);
      const currentConversation = useMemo(
        () => conversations[selectedConversationId] ?? createConversation({ conversationId }),
        [conversationId, conversations, createConversation, selectedConversationId]
      );

      const { cases } = useKibana().services;
      const bottomRef = useRef<HTMLDivElement | null>(null);

      const [promptTextPreview, setPromptTextPreview] = useState<string>('');
      const [systemPrompts] = useState<Prompt[]>([getDefaultSystemPrompt(), getSuperheroPrompt()]);
      const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string | null>(
        getDefaultSystemPrompt().id
      );
      const [autoPopulatedOnce, setAutoPopulatedOnce] = useState<boolean>(false);
      const [suggestedUserPrompt, setSuggestedUserPrompt] = useState<string | null>(null);

      // For auto-focusing prompt within timeline
      const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);
      useEffect(() => {
        if (shouldRefocusPrompt && promptTextAreaRef.current) {
          promptTextAreaRef?.current.focus();
        }
      }, [shouldRefocusPrompt]);

      // Scroll to bottom on conversation change
      useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, []);
      useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, [currentConversation.messages.length]);
      ////

      // Attach to case support
      const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({
        onClose: () => {},
        onSuccess: () => {},
      });
      const handleAddToExistingCaseClick = useCallback(
        (messageContents: string) => {
          selectCaseModal.open({
            getAttachments: () => [
              {
                comment: messageContents,
                type: CommentType.user,
                owner: 'Elastic Security Assistant++',
              },
            ],
          });
        },
        [selectCaseModal]
      );
      ////

      // Handles sending latest user prompt to API
      const handleSendMessage = useCallback(
        async (promptText) => {
          // Conditional logic for handling user input to fork on specific hardcoded commands
          if (promptText.toLowerCase() === 'i need help with alerts') {
            // await handleOpenAlerts({
            //   chatHistory: updatedConversation,
            //   setChatHistory: setConversation,
            // });
          } else if (isFileHash(promptText)) {
            // await handleFileHash({
            //   promptText,
            //   chatHistory: updatedConversation,
            //   setChatHistory: setConversation,
            //   settings: currentConversation.apiConfig,
            // });
          } else {
            // send: the system prompt as it's own message:
            // const systemMessages = getSystemMessages({
            //   isNewChat: currentConversation.messages.length === 0,
            //   selectedSystemPrompt: getPromptById({
            //     prompts: systemPrompts,
            //     id: selectedSystemPromptId ?? '',
            //   }),
            // });
            ///
            // const updatedMessages = [...systemMessages, message].reduce<Message[]>(
            //   (acc, msg) => [
            //     ...acc,
            //     ...appendMessage({
            //       conversationId: selectedConversationId,
            //       message: msg,
            //     }),
            //   ],
            //   []
            // );

            const message = await getCombinedMessage({
              isNewChat: currentConversation.messages.length === 0,
              promptContexts,
              promptText,
              selectedPromptContextIds,
              selectedSystemPrompt: getPromptById({
                id: selectedSystemPromptId ?? '',
                prompts: systemPrompts,
              }),
            });

            const updatedMessages = appendMessage({
              conversationId: selectedConversationId,
              message,
            });
            const rawResponse = await sendMessages(updatedMessages);
            const responseMessage: Message = getMessageFromRawResponse(rawResponse);
            appendMessage({ conversationId: selectedConversationId, message: responseMessage });
          }
        },
        [
          appendMessage,
          currentConversation.messages.length,
          promptContexts,
          selectedConversationId,
          selectedPromptContextIds,
          selectedSystemPromptId,
          sendMessages,
          systemPrompts,
        ]
      );

      const handleSendContextMessage = useCallback(
        async (content) => {
          const message: Message = {
            role: 'user',
            content,
            timestamp: new Date().toLocaleString(),
          };

          const updatedMessages = appendMessage({
            conversationId: selectedConversationId,
            message,
          });

          const rawResponse = await sendMessages(updatedMessages);
          const responseMessage: Message = getMessageFromRawResponse(rawResponse);

          appendMessage({ conversationId: selectedConversationId, message: responseMessage });
        },
        [appendMessage, selectedConversationId, sendMessages]
      );

      // Drill in `Add To Timeline` action
      // Grab all relevant dom elements
      const commentBlocks = [...document.getElementsByClassName('euiMarkdownFormat')];
      // Filter if no code block exists as to not make extra portals
      commentBlocks.filter((cb) => cb.querySelectorAll('.euiCodeBlock__code').length > 0);

      let commentDetails: Array<{
        commentBlock: Element;
        codeBlocks: Element[];
        codeBlockControls: Element[];
        dataProviders: DataProvider[];
      }> =
        currentConversation.messages.length > 0
          ? commentBlocks.map((commentBlock) => {
              return {
                commentBlock,
                codeBlocks: [...commentBlock.querySelectorAll('.euiCodeBlock__code')],
                codeBlockControls: [...commentBlock.querySelectorAll('.euiCodeBlock__controls')],
                dataProviders: [],
              };
            })
          : [];
      commentDetails = commentDetails.map((details) => {
        const dataProviders: DataProvider[] = details.codeBlocks.map((codeBlock, i) => {
          return {
            id: 'assistant-data-provider',
            name: 'Assistant Query',
            enabled: true,
            // overriding to use as isEQL
            excluded: details.commentBlock?.textContent?.includes('EQL') ?? false,
            kqlQuery: codeBlock.textContent ?? '',
            queryMatch: {
              field: 'host.name',
              operator: ':',
              value: 'test',
            },
            and: [],
          };
        });
        return {
          ...details,
          dataProviders,
        };
      });
      ////

      // Add min-height to all codeblocks so timeline icon doesn't overflow
      const codeBlockContainers = [...document.getElementsByClassName('euiCodeBlock')];
      // @ts-ignore-expect-error
      codeBlockContainers.forEach((e) => (e.style.minHeight = '75px'));
      ////

      useEffect(() => {
        // Adding `conversationId !== selectedConversationId` to prevent auto-run still executing after changing selected conversation
        if (currentConversation.messages.length || conversationId !== selectedConversationId) {
          return;
        }

        if (autoPopulatedOnce) {
          return;
        }

        const promptContext: PromptContext | undefined = promptContexts[promptContextId];
        if (promptContext != null) {
          setAutoPopulatedOnce(true);

          // select this prompt context
          if (!selectedPromptContextIds.includes(promptContext.id)) {
            setSelectedPromptContextIds((prev) => [...prev, promptContext.id]);
          }

          if (promptContext?.suggestedUserPrompt != null) {
            setSuggestedUserPrompt(promptContext.suggestedUserPrompt);
          }
        }
      }, [
        currentConversation.messages,
        promptContexts,
        promptContextId,
        handleSendMessage,
        conversationId,
        selectedConversationId,
        selectedPromptContextIds,
        autoPopulatedOnce,
      ]);

      return (
        <EuiPanel>
          {showTitle && (
            <>
              <EuiPageHeader
                pageTitle={i18n.SECURITY_ASSISTANT_TITLE}
                rightSideItems={[
                  <ConversationSelector
                    conversationId={selectedConversationId}
                    onSelectionChange={(id) => setSelectedConversationId(id)}
                  />,
                ]}
                iconType="logoSecurity"
              />
              <EuiHorizontalRule margin={'m'} />
            </>
          )}

          {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
          {currentConversation.messages.length > 0 &&
            commentDetails.length > 0 &&
            // eslint-disable-next-line array-callback-return
            commentDetails.map((e) => {
              if (e.dataProviders != null && e.dataProviders.length > 0) {
                return e.codeBlocks.map((block, i) => {
                  if (e.codeBlockControls[i] != null) {
                    return createPortal(
                      <SendToTimelineButton
                        asEmptyButton={true}
                        dataProviders={[e.dataProviders?.[i] ?? []]}
                        keepDataView={true}
                      >
                        <EuiToolTip position="right" content={'Add to timeline'}>
                          <EuiIcon type="timeline" />
                        </EuiToolTip>
                      </SendToTimelineButton>,
                      e.codeBlockControls[i]
                    );
                  } else {
                    return <></>;
                  }
                });
              }
            })}

          <ContextPills
            isNewChat={currentConversation.messages.length === 0}
            onSendContextMessage={handleSendContextMessage}
            promptContexts={promptContexts}
            selectedPromptContextIds={selectedPromptContextIds}
            setSelectedPromptContextIds={setSelectedPromptContextIds}
          />

          <EuiSpacer />

          <CommentsContainer>
            {currentConversation.messages.length === 0 && (
              <FirstPromptEditor
                promptContexts={promptContexts}
                promptTextPreview={promptTextPreview}
                selectedPromptContextIds={selectedPromptContextIds}
                selectedSystemPromptId={selectedSystemPromptId}
                setSelectedPromptContextIds={setSelectedPromptContextIds}
                setSelectedSystemPromptId={setSelectedSystemPromptId}
                systemPrompts={systemPrompts}
              />
            )}

            <StyledCommentList
              comments={currentConversation.messages.map((message, index) => {
                const isUser = message.role === 'user';
                const commentProps: EuiCommentProps = {
                  username: isUser ? 'You' : 'Assistant',
                  actions: (
                    <>
                      <EuiToolTip position="top" content={'Add to case'}>
                        <EuiButtonIcon
                          onClick={() => handleAddToExistingCaseClick(message.content)}
                          iconType="addDataApp"
                          color="primary"
                          aria-label="Add to existing case"
                        />
                      </EuiToolTip>
                      <EuiToolTip position="top" content={'Copy message'}>
                        <EuiCopy textToCopy={message.content}>
                          {(copy) => (
                            <EuiButtonIcon
                              onClick={copy}
                              iconType="copyClipboard"
                              color="primary"
                              aria-label="Copy message content to clipboard"
                            />
                          )}
                        </EuiCopy>
                      </EuiToolTip>
                    </>
                  ),
                  // event: isUser ? 'Asked a question' : 'Responded with',
                  children: (
                    <EuiText>
                      <EuiMarkdownFormat>{message.content}</EuiMarkdownFormat>
                    </EuiText>
                  ),
                  timelineAvatar: isUser ? (
                    <EuiAvatar name="user" size="l" color="subdued" iconType={'logoSecurity'} />
                  ) : (
                    <EuiAvatar
                      name="machine"
                      size="l"
                      color="subdued"
                      iconType={'machineLearningApp'}
                    />
                  ),
                  timestamp: `at: ${message.timestamp}`,
                };
                return commentProps;
              })}
            />
            <div ref={bottomRef} />
          </CommentsContainer>

          <EuiSpacer />

          <ChatContainerFlexGroup gutterSize="s">
            <PromptTextArea
              onPromptSubmit={handleSendMessage}
              ref={promptTextAreaRef}
              handlePromptChange={setPromptTextPreview}
              value={suggestedUserPrompt}
            />

            <ChatOptionsFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiToolTip position="right" content={'Clear chat'}>
                    <EuiButtonIcon
                      display="base"
                      iconType="trash"
                      aria-label="Delete"
                      color="danger"
                      onClick={() => {
                        setPromptTextPreview('');
                        clearConversation(selectedConversationId);
                        setSelectedSystemPromptId(getDefaultSystemPrompt().id);
                        setSelectedPromptContextIds([]);
                      }}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip position="right" content={'Submit message'}>
                    <EuiButtonIcon
                      display="base"
                      iconType="returnKey"
                      aria-label="Delete"
                      color="primary"
                      onClick={handleSendMessage}
                      isLoading={isLoading}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <SettingsPopover />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ChatOptionsFlexItem>
          </ChatContainerFlexGroup>
        </EuiPanel>
      );
    }
  );
SecurityAssistant.displayName = 'SecurityAssistant';
