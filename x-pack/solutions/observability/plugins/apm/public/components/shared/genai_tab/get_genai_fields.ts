/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTRIBUTE_GEN_AI_CONVERSATION_ID,
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OPERATION_NAME,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_PROVIDER_NAME,
  ATTRIBUTE_GEN_AI_REQUEST_MAX_TOKENS,
  ATTRIBUTE_GEN_AI_REQUEST_MODEL,
  ATTRIBUTE_GEN_AI_REQUEST_SEED,
  ATTRIBUTE_GEN_AI_REQUEST_TEMPERATURE,
  ATTRIBUTE_GEN_AI_REQUEST_TOP_K,
  ATTRIBUTE_GEN_AI_REQUEST_TOP_P,
  ATTRIBUTE_GEN_AI_RESPONSE_FINISH_REASONS,
  ATTRIBUTE_GEN_AI_RESPONSE_ID,
  ATTRIBUTE_GEN_AI_RESPONSE_MODEL,
  ATTRIBUTE_GEN_AI_SYSTEM,
  ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS,
  ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS,
  ATTRIBUTE_GEN_AI_USAGE_OUTPUT_TOKENS,
} from '@kbn/apm-types/es_fields';

export interface GenAiMessage {
  role: string;
  content?: string;
  parts?: Array<{ type: string; content?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface GenAiFields {
  operationName?: string;
  requestModel?: string;
  responseModel?: string;
  provider?: string;
  system?: string;
  inputTokens?: number;
  outputTokens?: number;
  conversationId?: string;
  requestParams: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    seed?: number;
  };
  response: {
    id?: string;
    finish_reasons?: string[];
  };
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
}

const GEN_AI_PATTERN = /(^|\.)gen[_.]ai[._]/;

/** Returns true if the metadata record contains any gen_ai field. */
export function hasGenAiData(metadata: Record<string, unknown>): boolean {
  return Object.keys(metadata).some((key) => GEN_AI_PATTERN.test(key));
}

/** Reads the first element of an array-valued field from the event_metadata map. */
function first<T>(metadata: Record<string, unknown>, key: string): T | undefined {
  const val = metadata[key];
  if (Array.isArray(val)) return val[0] as T | undefined;
  return val as T | undefined;
}

export function parseGenAiMessages(raw: unknown): GenAiMessage[] {
  if (!raw) return [];
  const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const parsed = JSON.parse(str);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((item) => {
      if (typeof item === 'object' && item !== null) return item as GenAiMessage;
      return { role: 'unknown', content: String(item) };
    });
  } catch {
    return [{ role: 'unknown', content: str }];
  }
}

export function getGenAiFields(metadata: Record<string, unknown>): GenAiFields {
  const f = (key: string) => first(metadata, key);

  return {
    operationName: f(ATTRIBUTE_GEN_AI_OPERATION_NAME) as string | undefined,
    requestModel: f(ATTRIBUTE_GEN_AI_REQUEST_MODEL) as string | undefined,
    responseModel: f(ATTRIBUTE_GEN_AI_RESPONSE_MODEL) as string | undefined,
    provider: (f(ATTRIBUTE_GEN_AI_PROVIDER_NAME) ?? f(ATTRIBUTE_GEN_AI_SYSTEM)) as
      | string
      | undefined,
    system: f(ATTRIBUTE_GEN_AI_SYSTEM) as string | undefined,
    inputTokens: f(ATTRIBUTE_GEN_AI_USAGE_INPUT_TOKENS) as number | undefined,
    outputTokens: f(ATTRIBUTE_GEN_AI_USAGE_OUTPUT_TOKENS) as number | undefined,
    conversationId: f(ATTRIBUTE_GEN_AI_CONVERSATION_ID) as string | undefined,
    requestParams: {
      temperature: f(ATTRIBUTE_GEN_AI_REQUEST_TEMPERATURE) as number | undefined,
      top_p: f(ATTRIBUTE_GEN_AI_REQUEST_TOP_P) as number | undefined,
      top_k: f(ATTRIBUTE_GEN_AI_REQUEST_TOP_K) as number | undefined,
      max_tokens: f(ATTRIBUTE_GEN_AI_REQUEST_MAX_TOKENS) as number | undefined,
      seed: f(ATTRIBUTE_GEN_AI_REQUEST_SEED) as number | undefined,
    },
    response: {
      id: f(ATTRIBUTE_GEN_AI_RESPONSE_ID) as string | undefined,
      finish_reasons: f(ATTRIBUTE_GEN_AI_RESPONSE_FINISH_REASONS) as string[] | undefined,
    },
    inputMessages: parseGenAiMessages(f(ATTRIBUTE_GEN_AI_INPUT_MESSAGES)),
    outputMessages: parseGenAiMessages(f(ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES)),
    systemInstructions: f(ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS) as string | undefined,
  };
}
