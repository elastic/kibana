/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONSchema } from 'json-schema-to-ts';
import type { Observable } from 'rxjs';
import { ChatCompletionChunkEvent, MessageAddEvent } from '../conversation_complete';
import { FunctionVisibility } from './function_visibility';
export { FunctionVisibility };

export type CompatibleJSONSchema = Exclude<JSONSchema, boolean>;

export interface ContextDefinition {
  name: string;
  description: string;
}

export type FunctionResponse =
  | {
      content?: any;
      data?: any;
    }
  | Observable<ChatCompletionChunkEvent | MessageAddEvent>;

export interface FunctionDefinition<TParameters extends CompatibleJSONSchema = any> {
  name: string;
  description: string;
  visibility?: FunctionVisibility;
  descriptionForUser?: string;
  parameters?: TParameters;
  contexts: string[];
}

export type RegisterContextDefinition = (options: ContextDefinition) => void;

export type ContextRegistry = Map<string, ContextDefinition>;
export type FunctionRegistry = Map<string, FunctionDefinition>;
