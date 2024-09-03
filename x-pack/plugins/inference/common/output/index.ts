/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { FromToolSchema, ToolSchema } from '../chat_complete/tool_schema';
import { InferenceTaskEventBase } from '../inference_task';
import { Message } from '../chat_complete';

export enum OutputEventType {
  OutputUpdate = 'output',
  OutputComplete = 'complete',
}

type Output = Record<string, any> | undefined | unknown;

export type OutputUpdateEvent<TId extends string = string> =
  InferenceTaskEventBase<OutputEventType.OutputUpdate> & {
    id: TId;
    content: string;
  };

export type OutputCompleteEvent<
  TId extends string = string,
  TOutput extends Output = Output
> = InferenceTaskEventBase<OutputEventType.OutputComplete> & {
  id: TId;
  output: TOutput;
  content?: string;
};

export type OutputEvent<TId extends string = string, TOutput extends Output = Output> =
  | OutputUpdateEvent<TId>
  | OutputCompleteEvent<TId, TOutput>;

/**
 * Generate a response with the LLM for a prompt, optionally based on a schema.
 *
 * @param {string} id The id of the operation
 * @param {string} options.connectorId The ID of the connector that is to be used.
 * @param {string} options.input The prompt for the LLM.
 * @param {string} options.messages Previous messages in a conversation.
 * @param {ToolSchema} [options.schema] The schema the response from the LLM should adhere to.
 */
export type OutputAPI = <
  TId extends string = string,
  TOutputSchema extends ToolSchema | undefined = ToolSchema | undefined
>(
  id: TId,
  options: {
    connectorId: string;
    system?: string;
    input: string;
    schema?: TOutputSchema;
    previousMessages?: Message[];
  }
) => Observable<
  OutputEvent<TId, TOutputSchema extends ToolSchema ? FromToolSchema<TOutputSchema> : undefined>
>;

export function createOutputCompleteEvent<TId extends string, TOutput extends Output>(
  id: TId,
  output: TOutput,
  content?: string
): OutputCompleteEvent<TId, TOutput> {
  return {
    id,
    type: OutputEventType.OutputComplete,
    output,
    content,
  };
}
