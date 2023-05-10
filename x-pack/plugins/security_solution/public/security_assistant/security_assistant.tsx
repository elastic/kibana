/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EuiComboBoxOptionOption, EuiCommentProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiCopy,
  EuiTextArea,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiCommentList,
  EuiAvatar,
  EuiPageHeader,
  EuiMarkdownFormat,
  EuiIcon,
  EuiToolTip,
  EuiComboBox,
  EuiFormRow,
} from '@elastic/eui';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';
import styled from 'styled-components';
import { css } from '@emotion/react';
import useEvent from 'react-use/lib/useEvent';
import * as i18n from './translations';

import { fetchChatCompletion } from './api';
import { useKibana } from '../common/lib/kibana';
import type { SecurityAssistantUiSettings } from './helpers';
import { handleFileHash, handleOpenAlerts, isFileHash } from './helpers';
import { SendToTimelineButton } from './send_to_timeline_button';
import { useLocalStorage } from '../common/components/local_storage';
import { SettingsPopover } from './settings_popover';
import type { PromptContext } from './prompt_context/types';
import { useSecurityAssistantContext } from './security_assistant_context';
import { ContextPills } from './context_pills';

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

const StyledTextArea = styled(EuiTextArea)`
  min-height: 125px;
`;

export const SECURITY_ASSISTANT_UI_SETTING_KEY = 'securityAssistant';

export interface SecurityAssistantProps {
  input?: string;
  promptContextId?: string;
  autoSendInput?: boolean;
  localStorageEnabled?: boolean;
  localStorageKey?: string;
  showTitle?: boolean;
}

const LOCAL_STORAGE_KEY = 'securityAssistant';

export enum ConversationRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}

interface ConversationItem {
  role: ConversationRole;
  content: string;
  timestamp: string;
}

export type SecurityAssistantConversation = ConversationItem[];

/**
 * Security Assistant component that renders a chat window with a prompt input and a chat history,
 * along with quick prompts for common actions, settings, and prompt context providers.
 */
export const SecurityAssistant: React.FC<SecurityAssistantProps> =
  React.memo<SecurityAssistantProps>(
    ({
      input = '',
      promptContextId = '',
      autoSendInput = false,
      showTitle = true,
      localStorageEnabled = true,
      localStorageKey = 'default',
    }) => {
      const { promptContexts } = useSecurityAssistantContext();
      const { cases, uiSettings } = useKibana().services;
      const bottomRef = useRef<HTMLDivElement | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const [selectedLocalStorageKey, setSelectedLocalStorageKey] = useState(localStorageKey);

      useEffect(() => {
        setPromptText(input);
        // TODO: Need to defer one render so promptText is set before sending message
        if (autoSendInput) {
          handleSendMessage();
        }
      }, [input]);

      // Prompt text
      const [promptText, setPromptText] = useState<string>(input);
      const handlePromptChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPromptText(event.target.value);
      }, []);
      ////

      // Chat history
      // TODO: Toggle localStorage on/off based on localStorageEnabled prop
      const [chatHistory, setChatHistory, setInitialized] =
        useLocalStorage<SecurityAssistantConversation>({
          defaultValue: [],
          key: `${LOCAL_STORAGE_KEY}.${selectedLocalStorageKey}`,
          isInvalidDefault: (valueFromStorage) => {
            return !valueFromStorage;
          },
        });
      const clearChat = () => {
        setChatHistory([]);
      };

      useEffect(() => {
        setInitialized(false);
      }, [selectedLocalStorageKey]);

      // Scroll to bottom on conversation change
      useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, [bottomRef.current]);
      useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, [chatHistory.length]);
      ////

      // Register keyboard listener to change selected conversation
      // TODO: Pick better keyboard shortcuts that don't interfere with text navigation
      const localStorageConversations = [{ label: 'default' }, { label: 'alertSummary' }];
      const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'ArrowRight' && (isMac ? event.metaKey : event.ctrlKey)) {
          event.preventDefault();
          // TODO: Query keys from localStorage to populate combobox
          setSelectedLocalStorageKey('alertSummary');
        }
        if (event.key === 'ArrowLeft' && (isMac ? event.metaKey : event.ctrlKey)) {
          event.preventDefault();
          setSelectedLocalStorageKey('default');
        }
      }, []);
      useEvent('keydown', onKeyDown);
      const onLocalStorageComboBoxChange = useCallback((options: EuiComboBoxOptionOption[]) => {
        setSelectedLocalStorageKey(options[0]?.label ?? 'default');
      }, []);
      const onLeftArrowClick = useCallback(() => {
        setSelectedLocalStorageKey(
          selectedLocalStorageKey === 'default' ? 'alertSummary' : 'default'
        );
      }, [selectedLocalStorageKey]);
      const onRightArrowClick = useCallback(() => {
        setSelectedLocalStorageKey(
          selectedLocalStorageKey === 'default' ? 'alertSummary' : 'default'
        );
      }, [selectedLocalStorageKey]);
      ////

      // Fetch secrets from configuration
      const { virusTotal, openAI } = uiSettings.get<SecurityAssistantUiSettings>(
        SECURITY_ASSISTANT_UI_SETTING_KEY
      );

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
      const handleSendMessage = useCallback(async () => {
        const dateTimeString = new Date().toLocaleString();

        if (!promptText.trim()) {
          return;
        }

        setIsLoading(true);

        const newChatHistory = [
          ...chatHistory,
          {
            role: ConversationRole.User,
            content: promptText,
            timestamp: dateTimeString,
          },
        ];
        setChatHistory(newChatHistory);
        setPromptText('');

        // Conditional logic for handling user input to fork on specific hardcoded commands
        if (promptText.toLowerCase() === 'i need help with alerts') {
          await handleOpenAlerts({ chatHistory: newChatHistory, setChatHistory });
        } else if (isFileHash(promptText)) {
          await handleFileHash({
            promptText,
            chatHistory: newChatHistory,
            setChatHistory,
            settings: { virusTotal, openAI },
          });
        } else {
          const response = await fetchChatCompletion({
            conversation: newChatHistory,
            baseUrl: openAI.baseUrl,
            apiKey: openAI.apiKey,
          });
          if (response) {
            setChatHistory([
              ...newChatHistory,
              { role: ConversationRole.Assistant, content: response, timestamp: dateTimeString },
            ]);
          } else {
            console.error('Error: Response from LLM API is empty or undefined.');
          }
        }
        setIsLoading(false);
      }, [promptText, chatHistory, handleOpenAlerts, virusTotal, openAI]);

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
        chatHistory.length > 0
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
        if (chatHistory.length > 0) {
          return;
        }

        const promptContext: PromptContext | undefined = promptContexts[promptContextId];
        const getAutoRunPrompt = promptContext?.getAutoRunPrompt;

        const autoRunOnOpen = async () => {
          if (getAutoRunPrompt != null) {
            const prompt = await getAutoRunPrompt();

            setPromptText(prompt);
            handleSendMessage();
          }
        };

        autoRunOnOpen();
      }, [chatHistory.length, promptContexts, promptContextId, handleSendMessage]);

      return (
        <EuiPanel>
          {showTitle && (
            <>
              <EuiPageHeader
                pageTitle={i18n.SECURITY_ASSISTANT_TITLE}
                rightSideItems={[
                  <EuiFormRow
                    label="Selected Conversation"
                    display="rowCompressed"
                    css={css`
                      min-width: 300px;
                      margin-top: -6px;
                    `}
                  >
                    <EuiComboBox
                      singleSelection={{ asPlainText: true }}
                      options={localStorageConversations}
                      selectedOptions={[{ label: selectedLocalStorageKey }]}
                      onChange={onLocalStorageComboBoxChange}
                      compressed={true}
                      aria-label="Conversation Selector"
                      prepend={
                        // <EuiToolTip content="Previous Conversation (⌘ + ←)">
                        <EuiButtonIcon
                          iconType="arrowLeft"
                          aria-label="Previous Conversation"
                          onClick={onLeftArrowClick}
                        />
                        // </EuiToolTip>
                      }
                      append={
                        // <EuiToolTip content="Next Conversation (⌘ + →)" display="block">
                        <EuiButtonIcon
                          iconType="arrowRight"
                          aria-label="Next Conversation"
                          onClick={onRightArrowClick}
                        />
                        // </EuiToolTip>
                      }
                    />
                  </EuiFormRow>,
                ]}
                iconType="logoSecurity"
              />
              <EuiHorizontalRule margin={'m'} />
            </>
          )}

          {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
          {chatHistory.length > 0 &&
            commentDetails.length > 0 &&
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

          <ContextPills promptContexts={promptContexts} />

          <EuiSpacer />

          <CommentsContainer>
            <StyledCommentList
              comments={chatHistory.map((message, index) => {
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
            <StyledTextArea
              id={'prompt-textarea'}
              data-test-subj={'prompt-textarea'}
              fullWidth
              autoFocus
              placeholder={i18n.PROMPT_PLACEHOLDER}
              value={promptText}
              onChange={handlePromptChange}
              onKeyPress={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
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
                      onClick={clearChat}
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
