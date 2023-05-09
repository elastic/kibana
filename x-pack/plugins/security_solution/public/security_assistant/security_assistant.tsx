/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EuiCommentProps } from '@elastic/eui';
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
} from '@elastic/eui';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import { CommentType } from '@kbn/cases-plugin/common';
import styled from 'styled-components';
import * as i18n from './translations';

import { fetchChatCompletion } from './api';
import { useKibana } from '../common/lib/kibana';
import type { SecurityAssistantUiSettings } from './helpers';
import { handleFileHash, handleOpenAlerts, isFileHash } from './helpers';
import { SendToTimelineButton } from './send_to_timeline_button';
import { useLocalStorage } from '../common/components/local_storage';
import { SettingsPopover } from './settings_popover';

const CommentsContainer = styled.div`
  max-height: 600px;
  overflow-y: scroll;
`;

export const SECURITY_ASSISTANT_UI_SETTING_KEY = 'securityAssistant';

export interface SecurityAssistantProps {
  input?: string;
  useLocalStorage?: boolean;
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

export const SecurityAssistant: React.FC<SecurityAssistantProps> =
  React.memo<SecurityAssistantProps>(({ input = '', showTitle = true }) => {
    const { cases, uiSettings } = useKibana().services;
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      setPromptText(input);
    }, [input]);

    // Prompt text
    const [promptText, setPromptText] = useState<string>(input);
    const handlePromptChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPromptText(event.target.value);
    }, []);
    ////

    // Chat history
    const [chatHistory, setChatHistory] = useLocalStorage<SecurityAssistantConversation>({
      defaultValue: [],
      key: LOCAL_STORAGE_KEY,
      isInvalidDefault: (valueFromStorage) => {
        return !valueFromStorage;
      },
    });
    const clearChat = () => {
      setChatHistory([]);
    };

    // Scroll to bottom on conversation change
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [bottomRef.current]);
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [chatHistory.length]);
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

    let commentDetails =
      chatHistory.length > 0
        ? commentBlocks.map((commentBlock) => {
            return {
              commentBlock,
              codeBlocks: [...commentBlock.querySelectorAll('.euiCodeBlock__code')],
              codeBlockControls: [...commentBlock.querySelectorAll('.euiCodeBlock__controls')],
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
    codeBlockContainers.forEach((e) => (e.style.minHeight = '75px'));
    ////

    return (
      <EuiPanel>
        {showTitle && (
          <>
            <EuiPageHeader pageTitle={i18n.SECURITY_ASSISTANT_TITLE} iconType="logoSecurity" />
            <EuiHorizontalRule />
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
                      <EuiIcon type="timeline" />
                    </SendToTimelineButton>,
                    e.codeBlockControls[i]
                  );
                } else {
                  return <></>;
                }
              });
            }
          })}

        <CommentsContainer>
          <EuiCommentList
            comments={chatHistory.map((message, index) => {
              const isUser = message.role === 'user';
              const commentProps: EuiCommentProps = {
                username: isUser ? 'You' : 'Assistant',
                actions: (
                  <>
                    <EuiButtonIcon
                      onClick={() => handleAddToExistingCaseClick(message.content)}
                      iconType="addDataApp"
                      color="primary"
                      aria-label="Add to existing case"
                    />
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

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiTextArea
              fullWidth
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
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  iconType="trash"
                  aria-label="Delete"
                  color="danger"
                  onClick={clearChat}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  display="base"
                  iconType="returnKey"
                  aria-label="Delete"
                  color="primary"
                  onClick={handleSendMessage}
                  isLoading={isLoading}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <SettingsPopover />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  });
SecurityAssistant.displayName = 'SecurityAssistant';
