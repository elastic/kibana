/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { isDeepStrictEqual } from 'util';
import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import { isErrorResult } from '@kbn/agent-builder-common/tools';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import type { ConversationRound, ToolResult } from '@kbn/agent-builder-common';
import { parseJsonAttr } from '@kbn/inference-tracing';
import type {
  GenAISemConvAttributes,
  GenAIInputMessage,
  GenAIOutputMessage,
  GenAITextPart,
} from '@kbn/inference-tracing';

/** Requires sandbox execution for the bundled fixtures without grading the calculation or answer. */
export const assertSuccessfulSandboxCommand = (
  rounds: Array<Pick<ConversationRound, 'steps'>>
): void => {
  assert(
    rounds
      .flatMap(({ steps }) => steps.filter(isToolCallStep))
      .some(
        ({ tool_id: toolId, results }) =>
          toolId === 'nightshift_sandbox_bash' &&
          results.some(
            ({ type, data }) =>
              type === ToolResultType.other && 'exit_code' in data && data.exit_code === 0
          )
      ),
    'Bundled synthetic investigations must include a successful sandbox command'
  );
};

/**
 * True when `text` contains every literal piece of `template` in order. `{{placeholders}}` (filled
 * at runtime, e.g. the optional decision-tree sections) may expand to anything, including nothing.
 */
export const containsTemplate = (text: string, template: string): boolean => {
  const pieces = template
    .trim()
    .split(/\{\{[a-z_]+\}\}/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  let from = 0;
  for (const piece of pieces) {
    const at = text.indexOf(piece, from);
    if (at === -1) return false;
    from = at + piece.length;
  }
  return pieces.length > 0;
};

/** Validates exported agent payloads independently of the placeholder score. */
export const assertAgentTrace = (
  attributes: GenAISemConvAttributes[],
  {
    question,
    conversationId,
    systemInstructions,
    rounds,
  }: {
    question: string;
    conversationId?: string;
    systemInstructions: string;
    rounds: Array<Pick<ConversationRound, 'steps' | 'response'>>;
  }
): void => {
  const inputMessages = attributes.flatMap(
    (span) => parseJsonAttr<GenAIInputMessage[]>(span['gen_ai.input.messages']) ?? []
  );
  assert(
    inputMessages.some(
      ({ role, parts }) =>
        role === 'user' &&
        parts.some((part) => part.type === 'text' && part.content.includes(question))
    ),
    'Agent trace must include the actual user question'
  );
  assert(
    conversationId && attributes.some((span) => span['gen_ai.conversation.id'] === conversationId),
    'Agent trace must include the investigation conversation ID'
  );
  const responses = attributes.flatMap(
    (span) => parseJsonAttr<GenAIOutputMessage[]>(span['gen_ai.output.messages']) ?? []
  );
  for (const { response } of rounds) {
    const structuredResponse = parseJsonAttr<object>(response.message);
    assert(
      response.message &&
        responses.some(
          ({ role, parts }) =>
            role === 'assistant' &&
            parts.some(
              (part) =>
                (part.type === 'text' && part.content === response.message) ||
                (part.type === 'tool_call' &&
                  structuredResponse !== undefined &&
                  isDeepStrictEqual(parseJsonAttr(part.arguments), structuredResponse))
            )
        ),
      'Agent trace must include the actual final response'
    );
  }
  const instructions = attributes.flatMap(
    (span) => parseJsonAttr<GenAITextPart[]>(span['gen_ai.system_instructions']) ?? []
  );
  assert(
    systemInstructions.trim() &&
      instructions.some(
        (part) => part.type === 'text' && containsTemplate(part.content, systemInstructions)
      ),
    'Agent trace must include the actual system instructions'
  );
  const toolCalls = rounds.flatMap(({ steps }) => steps.filter(isToolCallStep));
  assert(toolCalls.length > 0, 'Investigation must include tool calls');
  for (const { tool_call_id: callId, tool_id: toolId, params, results } of toolCalls) {
    const modelCalls = responses.flatMap(({ parts }) =>
      parts.filter(
        (part) =>
          part.type === 'tool_call' && part.id === callId && part.name === sanitizeToolId(toolId)
      )
    );
    const span = attributes.find(
      (candidate) =>
        candidate['gen_ai.tool.call.id'] === callId && candidate['gen_ai.tool.name'] === toolId
    );
    // Schema rejection happens before execute_tool; its attempted call and error live in LLM messages.
    if (
      !span &&
      results.length > 0 &&
      results.every(isErrorResult) &&
      results.every(({ data }) =>
        data.message.startsWith('Error: Received tool input did not match expected schema')
      )
    ) {
      assert(
        modelCalls.some((part) => {
          if (part.type !== 'tool_call') return false;
          const attempted = parseJsonAttr<object>(part.arguments);
          return attempted !== null && typeof attempted === 'object' && !Array.isArray(attempted);
        }),
        `Agent trace must retain the rejected call ${callId}`
      );
      assert(
        inputMessages.some(
          ({ role, parts }) =>
            role === 'assistant' &&
            parts.some(
              (part) =>
                part.type === 'tool_call' &&
                part.id === callId &&
                isDeepStrictEqual(parseJsonAttr(part.arguments), params)
            )
        ),
        `Agent trace must retain rejected arguments for ${callId}`
      );
      assert(
        results.every(({ data }) =>
          inputMessages.some(
            ({ role, parts }) =>
              role === 'tool' &&
              parts.some(
                (part) =>
                  part.type === 'tool_call_response' &&
                  part.id === callId &&
                  parseJsonAttr<{ response: string }>(part.response)?.response?.includes(
                    data.message
                  )
              )
          )
        ),
        `Agent trace must retain the validation error for ${callId}`
      );
      continue;
    }
    assert(
      modelCalls.some(
        (part) =>
          part.type === 'tool_call' && isDeepStrictEqual(parseJsonAttr(part.arguments), params)
      ),
      `Agent trace must retain the model tool call ${callId}`
    );
    assert(span, `Agent trace must include tool call ${callId}`);
    assert.deepStrictEqual(
      parseJsonAttr(span['gen_ai.tool.call.arguments']),
      params,
      `Agent trace must retain arguments for ${callId}`
    );
    const result = parseJsonAttr<ToolResult[] | { results?: ToolResult[]; error?: string }>(
      span['gen_ai.tool.call.result']
    );
    assert(result && typeof result === 'object', `Missing tool result for ${callId}`);
    // Errored tool spans store the result array or thrown error rather than the handler envelope.
    const traceResults = Array.isArray(result)
      ? result
      : result.results ??
        (typeof result.error === 'string'
          ? [{ type: ToolResultType.error, data: { message: result.error } }]
          : undefined);
    assert(Array.isArray(traceResults), `Malformed tool result for ${callId}`);
    // Result IDs can be assigned after the execution span has already been exported.
    assert.deepStrictEqual(
      traceResults.map(({ type, data }) => ({ type, data })),
      results.map(({ type, data }) => ({ type, data })),
      `Agent trace must retain results for ${callId}`
    );
  }
};
