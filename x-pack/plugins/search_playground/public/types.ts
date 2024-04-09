/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HealthStatus,
  IndexName,
  IndicesStatsIndexMetadataState,
  QueryDslQueryContainer,
  Uuid,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { HttpStart } from '@kbn/core-http-browser';
import React, { ComponentType } from 'react';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { ChatRequestData } from '../common/types';
import type { App } from './components/app';
import type { PlaygroundProvider as PlaygroundProviderComponent } from './providers/playground_provider';
import type { Toolbar } from './components/toolbar';

export * from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginSetup {}
export interface SearchPlaygroundPluginStart {
  PlaygroundProvider: React.FC<React.ComponentProps<typeof PlaygroundProviderComponent>>;
  PlaygroundToolbar: React.FC<React.ComponentProps<typeof Toolbar>>;
  Playground: React.FC<React.ComponentProps<typeof App>>;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export interface AppServicesContext {
  http: HttpStart;
  security: SecurityPluginStart;
  share: SharePluginStart;
  cloud?: CloudSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export enum ChatFormFields {
  question = 'question',
  citations = 'citations',
  prompt = 'prompt',
  indices = 'indices',
  elasticsearchQuery = 'elasticsearch_query',
  summarizationModel = 'summarization_model',
  sourceFields = 'source_fields',
  docSize = 'doc_size',
}

export interface ChatForm {
  [ChatFormFields.question]: string;
  [ChatFormFields.prompt]: string;
  [ChatFormFields.citations]: boolean;
  [ChatFormFields.indices]: string[];
  [ChatFormFields.summarizationModel]: LLMModel;
  [ChatFormFields.elasticsearchQuery]: { query: QueryDslQueryContainer };
  [ChatFormFields.sourceFields]: string[];
  [ChatFormFields.docSize]: number;
}

export enum MessageRole {
  'user' = 'human',
  'assistant' = 'assistant',
  'system' = 'system',
}

export interface Message {
  id: string;
  content: string | React.ReactNode;
  createdAt?: Date;
  annotations?: Annotation[];
  role: MessageRole;
}

export interface DocAnnotation {
  metadata: { id: string; score: number };
  pageContent: string;
}

export interface Annotation {
  type: 'citations' | 'retrieved_docs';
  documents: DocAnnotation[];
}

export interface Doc {
  id: string;
  content: string;
}

export interface AIMessage extends Message {
  role: MessageRole.assistant;
  citations: Doc[];
  retrievalDocs: Doc[];
}

export enum SummarizationModelName {
  gpt3_5_turbo = 'gpt-3.5-turbo',
  gpt3_5_turbo_1106 = 'gpt-3.5-turbo-1106',
  gpt3_5_turbo_16k = 'gpt-3.5-turbo-16k',
  gpt3_5_turbo_16k_0613 = 'gpt-3.5-turbo-16k-0613',
  gpt3_5_turbo_instruct = 'gpt-3.5-turbo-instruct',
}

export interface ElasticsearchIndex {
  count: number; // Elasticsearch _count
  has_in_progress_syncs?: boolean; // these default to false if not a connector or crawler
  has_pending_syncs?: boolean;
  health?: HealthStatus;
  hidden: boolean;
  name: IndexName;
  status?: IndicesStatsIndexMetadataState;
  total: {
    docs: {
      count: number; // Lucene count (includes nested documents)
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  uuid?: Uuid;
}

export type JSONValue = null | string | number | boolean | { [x: string]: JSONValue } | JSONValue[];

export interface ChatRequestOptions {
  options?: RequestOptions;
  data?: ChatRequestData;
}

export type CreateMessage = Omit<Message, 'id'> & {
  id?: Message['id'];
};

export interface ChatRequest extends Pick<ChatRequestOptions, 'options' | 'data'> {
  messages: Message[];
}

export interface UseChatOptions {
  api?: string | ((init: RequestInit) => Promise<Response>);
  id?: string;
  initialInput?: string;
  onError?: (error: Error) => void;
  headers?: Record<string, string> | Headers;
  body?: object;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: {
      value: string;
    };
  }>;
}

export interface RequestOptions {
  headers?: Record<string, string> | Headers;
  body?: object;
}

export interface UseChatHelpers {
  messages: Message[];
  error: undefined | Error;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  reload: (chatRequestOptions?: ChatRequestOptions) => Promise<string | null | undefined>;
  stop: () => void;
  setMessages: (messages: Message[]) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  isLoading: boolean;
}

export interface LLMModel {
  name: string;
  value?: string;
  icon: ComponentType;
  disabled: boolean;
  connectorId?: string;
}
