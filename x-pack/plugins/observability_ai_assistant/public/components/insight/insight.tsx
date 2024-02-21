/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { cloneDeep, last } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { MessageRole, type Message } from '../../../common/types';
import { sendEvent, TELEMETRY } from '../../analytics';
import { ObservabilityAIAssistantChatServiceProvider } from '../../context/observability_ai_assistant_chat_service_provider';
import { useAbortableAsync } from '../../hooks/use_abortable_async';
import { ChatState, useChat } from '../../hooks/use_chat';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useObservabilityAIAssistantChatService } from '../../hooks/use_observability_ai_assistant_chat_service';
import { getConnectorsManagementHref } from '../../utils/get_connectors_management_href';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StartChatButton } from '../buttons/start_chat_button';
import { StopGeneratingButton } from '../buttons/stop_generating_button';
import { ChatFlyout } from '../chat/chat_flyout';
import { FeedbackButtons } from '../feedback_buttons';
import { MessagePanel } from '../message_panel/message_panel';
import { MessageText } from '../message_panel/message_text';
import { MissingCredentialsCallout } from '../missing_credentials_callout';
import { InsightBase } from './insight_base';
import { ActionsMenu } from './actions_menu';

function getLastMessageOfType(messages: Message[], role: MessageRole) {
  return last(messages.filter((msg) => msg.message.role === role));
}

function ChatContent({
  title: defaultTitle,
  initialMessages,
  connectorId,
}: {
  title: string;
  initialMessages: Message[];
  connectorId: string;
}) {
  const service = useObservabilityAIAssistant();
  const chatService = useObservabilityAIAssistantChatService();

  const initialMessagesRef = useRef(initialMessages);

  const { messages, next, state, stop } = useChat({
    service,
    chatService,
    connectorId,
    initialMessages,
    persist: false,
  });

  const lastAssistantResponse = getLastMessageOfType(messages, MessageRole.Assistant);

  useEffect(() => {
    next(initialMessagesRef.current);
  }, [next]);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <MessagePanel
        body={
          <MessageText
            content={lastAssistantResponse?.message.content ?? ''}
            loading={state === ChatState.Loading}
            onActionClick={async () => {}}
          />
        }
        error={state === ChatState.Error}
        controls={
          state === ChatState.Loading ? (
            <StopGeneratingButton
              onClick={() => {
                stop();
              }}
            />
          ) : (
            <EuiFlexGroup direction="row">
              <FeedbackButtons
                onClickFeedback={(feedback) => {
                  if (lastAssistantResponse) {
                    sendEvent(chatService.analytics, {
                      type: TELEMETRY.observability_ai_assistant_insight_feedback,
                      payload: {
                        feedback,
                        message: lastAssistantResponse,
                      },
                    });
                  }
                }}
              />
              <EuiFlexItem grow={false}>
                <RegenerateResponseButton
                  onClick={() => {
                    next(initialMessages);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <StartChatButton
                  onClick={() => {
                    setIsOpen(() => true);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
      />
      <ChatFlyout
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        initialMessages={messages}
        initialTitle={defaultTitle}
        startedFrom="contextualInsight"
      />
    </>
  );
}

function PromptEdit({
  initialPrompt,
  onSend,
  onCancel,
}: {
  initialPrompt: string;
  onSend: (updatedPrompt: string) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);

  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem grow={true}>
        <EuiTextArea
          data-test-subj="observabilityAiAssistantInsightEditPromptTextArea"
          inputRef={(textarea) => {
            if (textarea) {
              setTimeout(() => textarea.focus());
            }
          }}
          fullWidth={true}
          defaultValue={prompt}
          onChange={(ev) => {
            setPrompt(ev.target.value);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.observabilityAiAssistant.insight.cancelPromptEdit', {
            defaultMessage: 'Cancel',
          })}
          data-test-subj="observabilityAiAssistantInsightCancelEditPromptButtonIcon"
          iconType="cross"
          display="base"
          color="danger"
          size="m"
          onClick={onCancel}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.observabilityAiAssistant.insight.sendPromptEdit', {
            defaultMessage: 'Send prompt',
          })}
          data-test-subj="observabilityAiAssistantInsightSendEditPromptButtonIcon"
          iconType="kqlFunction"
          display="fill"
          size="m"
          onClick={() => onSend(prompt)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export interface InsightProps {
  messages: Message[];
  title: string;
  dataTestSubj?: string;
}

export function Insight({ messages, title, dataTestSubj }: InsightProps) {
  const [initialMessages, setInitialMessages] = useState(messages);
  const [isEditingPrompt, setEditingPrompt] = useState(false);
  const [isInsightOpen, setInsightOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [isPromptUpdated, setIsPromptUpdated] = useState(false);

  const connectors = useGenAIConnectors();

  const service = useObservabilityAIAssistant();

  const chatService = useAbortableAsync(
    ({ signal }) => {
      return service.start({ signal });
    },
    [service]
  );

  const handleSend = (newPrompt: string) => {
    const clonedMessages = cloneDeep(messages);
    const userMessage = getLastMessageOfType(clonedMessages, MessageRole.User);
    if (!userMessage) return false;

    userMessage.message.content = newPrompt;
    setIsPromptUpdated(true);
    setInitialMessages(clonedMessages);
    setEditingPrompt(false);
    return true;
  };

  const handleCancel = () => {
    setEditingPrompt(false);
    setInsightOpen(false);
    setHasOpened(false);
  };

  const {
    services: { http },
  } = useKibana();

  let children: React.ReactNode = null;

  if (
    connectors.selectedConnector &&
    ((!isInsightOpen && hasOpened) || (isInsightOpen && !isEditingPrompt))
  ) {
    children = (
      <>
        {isPromptUpdated ? (
          <>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {i18n.translate('xpack.observabilityAiAssistant.insightModifiedPrompt', {
                    defaultMessage: 'This insight has been modified.',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="observabilityAiAssistantInsightResetDefaultPrompt"
                  onClick={() => {
                    setIsPromptUpdated(false);
                    setHasOpened(false);
                    setInsightOpen(false);
                    setInitialMessages(messages);
                  }}
                >
                  <EuiText size="xs">
                    {i18n.translate('xpack.observabilityAiAssistant.resetDefaultPrompt', {
                      defaultMessage: 'Reset to default',
                    })}
                  </EuiText>
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule size="full" margin="none" />
            <EuiSpacer size="m" />
          </>
        ) : null}

        <ChatContent
          title={title}
          initialMessages={initialMessages}
          connectorId={connectors.selectedConnector}
        />
      </>
    );
  } else if (isEditingPrompt) {
    children = (
      <PromptEdit
        initialPrompt={
          getLastMessageOfType(initialMessages, MessageRole.User)?.message.content || ''
        }
        onSend={handleSend}
        onCancel={handleCancel}
      />
    );
  } else if (!connectors.loading && !connectors.connectors?.length) {
    children = (
      <MissingCredentialsCallout connectorsManagementHref={getConnectorsManagementHref(http!)} />
    );
  }

  return (
    <InsightBase
      title={title}
      onToggle={(isOpen) => {
        setHasOpened((prevHasOpened) => {
          if (isEditingPrompt) return false;
          return prevHasOpened || isOpen;
        });
        setInsightOpen(isOpen);
      }}
      controls={
        <ActionsMenu
          connectors={connectors}
          onEditPrompt={() => {
            setEditingPrompt(true);
            setInsightOpen(true);
          }}
        />
      }
      loading={connectors.loading || chatService.loading}
      dataTestSubj={dataTestSubj}
      isOpen={isInsightOpen}
    >
      {chatService.value ? (
        <ObservabilityAIAssistantChatServiceProvider value={chatService.value}>
          {children}
        </ObservabilityAIAssistantChatServiceProvider>
      ) : null}
    </InsightBase>
  );
}
