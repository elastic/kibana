/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { EsClient } from '@kbn/scout';
import { createCompletedWithTraceEvaluator } from './completed_with_trace';
import type { InvestigationTaskOutput } from './types';

const traceId = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const toolCall = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'call',
  tool_id: 'nightshift_sandbox_bash',
  params: { command: 'python calculate.py' },
  results: [{ tool_result_id: 'result', type: ToolResultType.other, data: { stdout: '30%' } }],
};
const conversation = {
  rounds: [
    {
      trace_id: traceId,
      steps: [toolCall],
      response: { message: 'Timeouts increased after the change.' },
    },
  ],
};
const attributes = {
  'gen_ai.input.messages': JSON.stringify([
    { role: 'user', parts: [{ type: 'text', content: 'Investigate synthetic timeouts.' }] },
  ]),
  'gen_ai.output.messages': JSON.stringify([
    {
      role: 'assistant',
      parts: [
        { type: 'text', content: 'Timeouts increased after the change.' },
        {
          type: 'tool_call',
          id: toolCall.tool_call_id,
          name: toolCall.tool_id,
          arguments: JSON.stringify(toolCall.params),
        },
      ],
    },
  ]),
  'gen_ai.system_instructions': JSON.stringify([
    { type: 'text', content: 'Investigate the evidence.' },
  ]),
  'gen_ai.tool.call.id': toolCall.tool_call_id,
  'gen_ai.tool.name': toolCall.tool_id,
  'gen_ai.tool.call.arguments': JSON.stringify(toolCall.params),
  'gen_ai.tool.call.result': JSON.stringify({ results: toolCall.results }),
  'gen_ai.conversation.id': 'conversation',
};
const completed: InvestigationTaskOutput = {
  case_id: 'timeouts',
  query: 'Investigate synthetic timeouts.',
  investigation_id: 'investigation',
  conversation_id: 'conversation',
  workflow_status: 'completed',
  structured_report: { conclusion: 'Timeouts increased after the change.' },
  conversation_round_count: 1,
  traceId,
};

const spansResponse = (spans: Array<Record<string, string>>) => ({
  hits: { hits: spans.map((span) => ({ _source: { attributes: span } })) },
});

const createEvaluator = ({
  fetch = jest.fn().mockResolvedValue(conversation),
  search = jest.fn().mockResolvedValue(spansResponse([attributes])),
}: { fetch?: jest.Mock; search?: jest.Mock } = {}) => ({
  fetch,
  search,
  evaluator: createCompletedWithTraceEvaluator({
    fetch,
    traceEsClient: { search } as unknown as EsClient,
    systemInstructions: 'Investigate the evidence.',
    poll: { timeoutMs: 50, intervalMs: 5 },
  }),
});

const evaluate = (
  evaluator: ReturnType<typeof createCompletedWithTraceEvaluator>,
  output: InvestigationTaskOutput
) =>
  evaluator.evaluate({
    input: { question: output.query },
    output,
    expected: undefined,
    metadata: { case_id: output.case_id },
  });

it('scores a completed investigation whose saved conversation is linked to its agent trace', async () => {
  const { evaluator, fetch, search } = createEvaluator();

  await expect(evaluate(evaluator, completed)).resolves.toMatchObject({
    score: 1,
    label: 'completed',
    metadata: { spans: 1, tool_calls: 1 },
  });
  expect(evaluator).toMatchObject({
    name: 'completed_with_trace',
    kind: 'CODE',
    direction: 'maximize',
  });
  expect(fetch).toHaveBeenCalledWith('/api/agent_builder/conversations/conversation', {
    headers: { 'elastic-api-version': '2023-10-31' },
  });
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({ query: { terms: { 'trace.id': [traceId] } } })
  );
});

it.each<[string, Partial<InvestigationTaskOutput>]>([
  [
    'timeout',
    {
      workflow_status: 'running',
      execution_error: 'Investigation did not reach a terminal status within 20 minutes',
    },
  ],
  // A poll that broke before the deadline is not a timeout.
  ['workflow_failed', { workflow_status: 'running', execution_error: 'fetch failed' }],
  ['workflow_failed', { workflow_status: 'failed', execution_error: 'Investigation failed' }],
  // A 400 from starting the investigation never persisted a report.
  ['workflow_failed', { workflow_status: undefined, execution_error: 'HTTP 400: Bad Request' }],
  ['workflow_failed', { workflow_status: 'cancelled', execution_error: 'Investigation cancelled' }],
  ['workflow_failed', { workflow_status: undefined, execution_error: 'Service unavailable' }],
  [
    'schema_rejected',
    {
      workflow_status: 'failed',
      execution_error:
        'HTTP 400: {"statusCode":400,"error":"Bad Request","message":"[{\\"code\\":\\"unrecognized_keys\\",\\"keys\\":[\\"hypotheses.esql_query\\"]}]"}',
    },
  ],
  ['no_report', { structured_report: { severity: '20-low' } }],
  ['no_report', { structured_report: undefined }],
  ['no_trace', { conversation_id: undefined }],
  ['no_trace', { traceId: undefined }],
  ['no_trace', { traceId: 'not-a-trace-id' }],
  // The runner records why the conversation could not be read; that reason is the explanation.
  ['no_trace', { traceId: undefined, execution_error: 'HTTP 503: conversation unavailable' }],
])('labels %s from the persisted task output without reading traces: %j', async (label, patch) => {
  const { evaluator, fetch, search } = createEvaluator();

  await expect(evaluate(evaluator, { ...completed, ...patch })).resolves.toMatchObject({
    score: 0,
    label,
    explanation: patch.execution_error ?? expect.any(String),
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
});

it('labels an investigation whose saved conversation cannot be read as no_trace', async () => {
  const { evaluator } = createEvaluator({
    fetch: jest.fn().mockRejectedValue(new Error('HTTP 404')),
  });

  await expect(evaluate(evaluator, completed)).resolves.toMatchObject({
    score: 0,
    label: 'no_trace',
    explanation: expect.stringContaining('HTTP 404'),
  });
});

it('labels a conversation with no exported spans as no_trace after the polling budget', async () => {
  const search = jest.fn().mockResolvedValue(spansResponse([]));
  const { evaluator } = createEvaluator({ search });

  await expect(evaluate(evaluator, completed)).resolves.toMatchObject({
    score: 0,
    label: 'no_trace',
    metadata: { spans: 0 },
  });
  expect(search.mock.calls.length).toBeGreaterThan(1);
});

it('labels a trace that is not linked to the saved conversation as trace_incomplete', async () => {
  const { evaluator } = createEvaluator({
    search: jest
      .fn()
      .mockResolvedValue(spansResponse([{ ...attributes, 'gen_ai.conversation.id': 'other' }])),
  });

  await expect(evaluate(evaluator, completed)).resolves.toMatchObject({
    score: 0,
    label: 'trace_incomplete',
    explanation: expect.stringContaining('conversation'),
    metadata: { spans: 1, tool_calls: 1 },
  });
});

it('waits for spans that arrive after the first query', async () => {
  const search = jest
    .fn()
    .mockRejectedValueOnce(new Error('search_phase_execution_exception'))
    .mockResolvedValueOnce(spansResponse([]))
    .mockResolvedValue(spansResponse([attributes]));
  const { evaluator } = createEvaluator({ search });

  await expect(evaluate(evaluator, completed)).resolves.toMatchObject({
    score: 1,
    label: 'completed',
  });
  expect(search).toHaveBeenCalledTimes(3);
});
