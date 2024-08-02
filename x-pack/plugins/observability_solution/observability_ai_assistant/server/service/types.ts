/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FromSchema } from 'json-schema-to-ts';
import { Observable } from 'rxjs';
import { ChatCompletionChunkEvent, ChatEvent } from '../../common/conversation_complete';
import type {
  CompatibleJSONSchema,
  FunctionDefinition,
  FunctionResponse,
} from '../../common/functions/types';
import type {
  Message,
  ObservabilityAIAssistantScreenContextRequest,
  UserInstructionOrPlainText,
} from '../../common/types';
import type { ObservabilityAIAssistantRouteHandlerResources } from '../routes/types';
import { ChatFunctionClient } from './chat_function_client';
import type { ObservabilityAIAssistantClient } from './client';

export type RespondFunctionResources = Pick<
  ObservabilityAIAssistantRouteHandlerResources,
  'context' | 'logger' | 'plugins' | 'request'
>;

export type ChatFunction = (
  name: string,
  params: Parameters<ObservabilityAIAssistantClient['chat']>[1]
) => Observable<ChatEvent>;

export type ChatFunctionWithoutConnector = (
  name: string,
  params: Omit<
    Parameters<ObservabilityAIAssistantClient['chat']>[1],
    'connectorId' | 'simulateFunctionCalling' | 'signal'
  >
) => Observable<ChatEvent>;

export type FunctionCallChatFunction = (
  name: string,
  params: Omit<
    Parameters<ObservabilityAIAssistantClient['chat']>[1],
    'connectorId' | 'simulateFunctionCalling' | 'tracer'
  >
) => Observable<ChatCompletionChunkEvent>;

type RespondFunction<TArguments, TResponse extends FunctionResponse> = (
  options: {
    arguments: TArguments;
    messages: Message[];
    screenContexts: ObservabilityAIAssistantScreenContextRequest[];
    chat: FunctionCallChatFunction;
  },
  signal: AbortSignal
) => Promise<TResponse>;

export interface FunctionHandler {
  definition: FunctionDefinition;
  respond: RespondFunction<any, FunctionResponse>;
}

export type RegisteredInstruction = UserInstructionOrPlainText | RegisterInstructionCallback;

type RegisterInstructionCallback = ({
  availableFunctionNames,
}: {
  availableFunctionNames: string[];
}) => UserInstructionOrPlainText | UserInstructionOrPlainText[] | undefined;

export type RegisterInstruction = (
  ...instructions: Array<UserInstructionOrPlainText | RegisterInstructionCallback>
) => void;

export type RegisterFunction = <
  TParameters extends CompatibleJSONSchema = any,
  TResponse extends FunctionResponse = any,
  TArguments = FromSchema<TParameters>
>(
  definition: FunctionDefinition<TParameters>,
  respond: RespondFunction<TArguments, TResponse>
) => void;
export type FunctionHandlerRegistry = Map<string, FunctionHandler>;

export type RegistrationCallback = ({}: {
  signal: AbortSignal;
  resources: RespondFunctionResources;
  client: ObservabilityAIAssistantClient;
  functions: ChatFunctionClient;
}) => Promise<void>;
