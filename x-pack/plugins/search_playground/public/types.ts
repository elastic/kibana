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
  Uuid,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { HttpStart } from '@kbn/core-http-browser';
import React, { ComponentType } from 'react';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { AppMountParameters } from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import { ChatRequestData, MessageRole } from '../common/types';
import type { App } from './components/app';
import type { PlaygroundProvider as PlaygroundProviderComponent } from './providers/playground_provider';
import { PlaygroundHeaderDocs } from './components/playground_header_docs';

export * from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPlaygroundPluginSetup {}
export interface SearchPlaygroundPluginStart {
  PlaygroundProvider: React.FC<React.ComponentProps<typeof PlaygroundProviderComponent>>;
  Playground: React.FC<React.ComponentProps<typeof App>>;
  PlaygroundHeaderDocs: React.FC<React.ComponentProps<typeof PlaygroundHeaderDocs>>;
}

export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  usageCollection?: UsageCollectionStart;
  navigation: NavigationPublicPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  share: SharePluginStart;
  console?: ConsolePluginStart;
}

export interface AppServicesContext {
  http: HttpStart;
  security: SecurityPluginStart;
  share: SharePluginStart;
  cloud?: CloudSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection?: UsageCollectionStart;
  console?: ConsolePluginStart;
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
  queryFields = 'query_fields',
}

export interface ChatForm {
  [ChatFormFields.question]: string;
  [ChatFormFields.prompt]: string;
  [ChatFormFields.citations]: boolean;
  [ChatFormFields.indices]: string[];
  [ChatFormFields.summarizationModel]: LLMModel;
  [ChatFormFields.elasticsearchQuery]: { retriever: any }; // RetrieverContainer leads to "Type instantiation is excessively deep and possibly infinite" error
  [ChatFormFields.sourceFields]: { [index: string]: string[] };
  [ChatFormFields.docSize]: number;
  [ChatFormFields.queryFields]: { [index: string]: string[] };
}

export interface Message {
  id: string;
  content: string | React.ReactNode;
  createdAt?: Date;
  annotations?: Annotation[];
  role: MessageRole;
}

export interface DocAnnotation {
  metadata: { _id: string; _score: number; _index: string };
  pageContent: string;
}

export type Annotation = AnnotationDoc | AnnotationTokens;

export interface AnnotationDoc {
  type: 'citations' | 'retrieved_docs';
  documents: DocAnnotation[];
}

export interface AnnotationTokens {
  type: 'prompt_token_count' | 'context_token_count' | 'context_clipped' | 'search_query';
  count: number;
  question?: string;
}

export interface Doc {
  content: string;
  metadata: { _id: string; _score: number; _index: string };
}

export interface AIMessage extends Message {
  role: MessageRole.assistant;
  citations: Doc[];
  retrievalDocs: Doc[];
  inputTokens: {
    context: number;
    total: number;
    contextClipped?: number;
    searchQuery: string;
  };
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
  id: string;
  name: string;
  value?: string;
  showConnectorName?: boolean;
  connectorId: string;
  connectorName: string;
  connectorType: string;
  icon: ComponentType;
  disabled: boolean;
  promptTokenLimit?: number;
}
