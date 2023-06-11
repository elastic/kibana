/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionRequestMessage } from 'openai';
import type {
  CoPilotConversation,
  CoPilotConversationMessage,
  CoPilotPromptId,
  CreateChatCompletionResponseChunk,
  PromptParamsOf,
} from '../../common/co_pilot';
import type { ChatResponseObservable } from '../../common/co_pilot/streaming_chat_response_observable';

export interface PromptObservableState {
  chunks: CreateChatCompletionResponseChunk[];
  message?: string;
}

export enum CoPilotChatViewType {
  List = 'coPilotChatList',
  Conversation = 'coPilotChatConversation',
}

export interface CoPilotWithUiService extends CoPilotService {
  showList: (filter?: string) => void;
  openConversation: (conversationId: string) => void;
  openNewConversation: (prompt: string) => void;
  close: () => void;
  get isOpen(): boolean;
  get promptInput(): string;
  get viewType(): CoPilotChatViewType;
  get conversationId(): string | undefined;
}

export interface CoPilotService {
  isEnabled: () => boolean;
  prompt<TPromptId extends CoPilotPromptId>(
    promptId: TPromptId,
    params: PromptParamsOf<TPromptId>
  ): ChatResponseObservable;
  createConversation: () => Promise<{ conversation: CoPilotConversation }>;
  listConversations: (size: number) => Promise<{ conversations: CoPilotConversation[] }>;
  loadConversation: (
    conversationId: string
  ) => Promise<{ conversation: CoPilotConversation; messages: CoPilotConversationMessage[] }>;
  chat: (messages: ChatCompletionRequestMessage[]) => ChatResponseObservable;
  autoTitleConversation: (conversationId: string) => Promise<{ conversation: CoPilotConversation }>;
  append: (
    conversationId: string,
    messages: ChatCompletionRequestMessage[]
  ) => Promise<{ messages: CoPilotConversationMessage[] }>;
}
