/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAutoBottomScroll } from '../hooks/use_auto_bottom_scroll';
import { ChatSidebar } from './chat_sidebar';
import { useChat } from '../hooks/use_chat';
import { ChatForm, ChatFormFields, ChatRequestData, MessageRole } from '../types';

import { MessageList } from './message_list/message_list';
import { QuestionInput } from './question_input';
import { StartNewChat } from './start_new_chat';

import { TelegramIcon } from './telegram_icon';
import { transformFromChatMessages } from '../utils/transform_to_messages';

const buildFormData = (formData: ChatForm): ChatRequestData => ({
  connector_id: formData[ChatFormFields.summarizationModel].connectorId!,
  prompt: formData[ChatFormFields.prompt],
  indices: formData[ChatFormFields.indices].join(),
  citations: formData[ChatFormFields.citations],
  elasticsearch_query: JSON.stringify(formData[ChatFormFields.elasticsearchQuery]),
  summarization_model: formData[ChatFormFields.summarizationModel].value,
  source_fields: JSON.stringify(formData[ChatFormFields.sourceFields]),
  doc_size: formData[ChatFormFields.docSize],
});

export const Chat = () => {
  const [showStartPage, setShowStartPage] = useState(true);
  const { euiTheme } = useEuiTheme();
  const {
    control,
    watch,
    formState: { isValid, isSubmitting },
    resetField,
    handleSubmit,
    getValues,
  } = useFormContext<ChatForm>();
  const { messages, append, stop: stopRequest, setMessages, reload } = useChat();
  const selectedIndicesCount = watch(ChatFormFields.indices, []).length;
  const messagesRef = useAutoBottomScroll([showStartPage]);

  const onSubmit = async (data: ChatForm) => {
    await append(
      { content: data.question, role: MessageRole.user, createdAt: new Date() },
      {
        data: buildFormData(data),
      }
    );

    resetField(ChatFormFields.question);
  };
  const chatMessages = useMemo(
    () => [
      {
        id: uuidv4(),
        role: MessageRole.system,
        content: 'You can start chat now',
      },
      ...transformFromChatMessages(messages),
    ],
    [messages]
  );

  const regenerateMessages = () => {
    const formData = getValues();
    reload({
      data: buildFormData(formData),
    });
  };

  if (showStartPage) {
    return <StartNewChat onStartClick={() => setShowStartPage(false)} />;
  }

  return (
    <EuiForm
      component="form"
      css={{ display: 'flex', flexGrow: 1 }}
      onSubmit={handleSubmit(onSubmit)}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem
          grow={2}
          css={{
            borderRight: euiTheme.border.thin,
            paddingTop: euiTheme.size.l,
            paddingBottom: euiTheme.size.l,
          }}
        >
          <EuiFlexGroup direction="column" className="eui-fullHeight">
            {/* // Set scroll at the border of parent element*/}
            <EuiFlexGroup
              direction="column"
              className="eui-yScroll"
              css={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}
              tabIndex={0}
              ref={messagesRef}
            >
              <MessageList messages={chatMessages} />
            </EuiFlexGroup>

            <EuiFlexItem
              grow={false}
              css={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}
            >
              <EuiHorizontalRule margin="none" />

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="sparkles"
                    disabled={chatMessages.length <= 1}
                    onClick={regenerateMessages}
                  >
                    <FormattedMessage
                      id="xpack.searchPlayground.chat.regenerateBtn"
                      defaultMessage="Regenerate"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="refresh"
                    disabled={chatMessages.length <= 1}
                    onClick={() => {
                      setMessages([]);
                    }}
                  >
                    <FormattedMessage
                      id="xpack.searchPlayground.chat.clearChatBtn"
                      defaultMessage="Clear chat"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              <Controller
                name={ChatFormFields.question}
                control={control}
                defaultValue=""
                rules={{
                  required: true,
                  validate: (rule) => !!rule?.trim(),
                }}
                render={({ field }) => (
                  <QuestionInput
                    value={field.value}
                    onChange={field.onChange}
                    isDisabled={isSubmitting}
                    button={
                      isSubmitting ? (
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.searchPlayground.chat.stopButtonAriaLabel',
                            {
                              defaultMessage: 'Stop request',
                            }
                          )}
                          display="base"
                          size="s"
                          iconType="stop"
                          onClick={stopRequest}
                        />
                      ) : (
                        <EuiButtonIcon
                          aria-label={i18n.translate(
                            'xpack.searchPlayground.chat.sendButtonAriaLabel',
                            {
                              defaultMessage: 'Send a question',
                            }
                          )}
                          display={isValid ? 'base' : 'empty'}
                          size="s"
                          type="submit"
                          isLoading={isSubmitting}
                          isDisabled={!isValid}
                          iconType={TelegramIcon}
                        />
                      )
                    }
                  />
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <ChatSidebar selectedIndicesCount={selectedIndicesCount} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
