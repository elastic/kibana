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

/**
 * Reads the first element of an array-valued field from the event_metadata map.
 * Tries three key shapes in order:
 *   1. attributes.gen_ai.*  — OTel / EDOT ingest
 *   2. gen_ai.*             — bare OTel (no attributes. prefix)
 *   3. labels.gen_ai_*      — APM Server ingest (dots → underscores)
 */
function first<T>(metadata: Record<string, unknown>, key: string): T | undefined {
  const read = (k: string) => {
    const val = metadata[k];
    if (val === undefined) return undefined;
    return (Array.isArray(val) ? val[0] : val) as T | undefined;
  };

  const direct = read(key);
  if (direct !== undefined) return direct;

  if (key.startsWith('attributes.')) {
    const bare = key.slice('attributes.'.length); // gen_ai.request.model
    const fromBare = read(bare);
    if (fromBare !== undefined) return fromBare;

    const labelsKey = 'labels.' + bare.replace(/\./g, '_'); // labels.gen_ai_request_model
    return read(labelsKey);
  }

  return undefined;
}

export function parseGenAiMessages(raw: string[] | undefined): GenAiMessage[] {
  if (!raw || raw.length === 0) return [];
  // NEW format: multi-element array where each element is one message JSON object
  if (raw.length > 1 || (raw.length === 1 && !raw[0].trimStart().startsWith('['))) {
    // each element is a single message like {"role":"user","content":"..."}
    return raw.flatMap((s) => {
      try {
        const msg = JSON.parse(s);
        // normalise: return as GenAiMessage (handle parts/content)
        if (msg && typeof msg === 'object' && 'role' in msg) return [msg as GenAiMessage];
        return [{ role: 'user', content: s }];
      } catch {
        return [{ role: 'user', content: s }];
      }
    });
  }
  // OLD format: single element containing the full JSON array "[{...},{...}]"
  try {
    const parsed = JSON.parse(raw[0]);
    if (Array.isArray(parsed)) return parsed as GenAiMessage[];
    return [parsed as GenAiMessage];
  } catch {
    return [{ role: 'user', content: raw[0] }];
  }
}

/**
 * Returns the full text of a message suitable for copying to the clipboard.
 * - Plain text / markdown messages: returns `content` verbatim.
 * - Newer `parts` schema: text parts verbatim, structured parts as pretty JSON,
 *   joined by a blank line so the result reads naturally.
 * - Structured messages (tool_calls, null content, etc.): whole message as pretty JSON.
 *
 * This is intentionally decoupled from the ViewMore visual collapse — it always
 * returns the complete message regardless of whether "View more" is expanded.
 */
export function getMessageCopyText(message: GenAiMessage): string {
  if (typeof message.content === 'string' && message.content.length > 0) {
    return message.content;
  }
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
      .map((p) =>
        p.type === 'text' && typeof p.content === 'string' ? p.content : JSON.stringify(p, null, 2)
      )
      .join('\n\n');
  }
  return JSON.stringify(message, null, 2);
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
    inputMessages: parseGenAiMessages(
      metadata[ATTRIBUTE_GEN_AI_INPUT_MESSAGES] as string[] | undefined
    ),
    outputMessages: parseGenAiMessages(
      metadata[ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES] as string[] | undefined
    ),
    systemInstructions: f(ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS) as string | undefined,
  };
}
