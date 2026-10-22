/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { INVESTIGATION_TIMEOUT_MS, UNPERSISTED_CONVERSATION_ERROR, runInvestigation } from './task';
import { ungradedPlaceholder } from './placeholder';

jest.mock('timers/promises', () => ({ setTimeout: jest.fn().mockResolvedValue(undefined) }));

const example = {
  input: { question: 'Investigate synthetic timeouts.' },
  metadata: { case_id: 'timeouts' },
};
const connector = { id: 'investigation-model' };

const investigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'investigation',
  title: 'Investigate synthetic timeouts.',
  title_pending: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:05:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', summary: 'Timeouts rose.', verdict: 'Synthetic timeouts increased.' },
  in_progress: false,
  subjects: [],
  proposals: [],
  ...overrides,
});

const notFound = () => Object.assign(new Error('Not Found'), { status: 404 });

const execution = (status: ExecutionStatus, stepExecutions: object[] = []) => ({
  id: 'execution',
  status,
  stepExecutions,
});

/** A conversation whose metadata names the investigation's workflow execution. */
const withExecution = <T extends object>(conversation: T) => ({
  ...conversation,
  metadata: { workflow_execution_ids: ['execution'] },
});

interface Routes {
  start?: unknown[];
  investigation?: unknown[];
  conversation?: unknown[];
  execution?: unknown[];
}

/**
 * Answers each API from its own queue of responses, repeating the last one once the queue is
 * down to it; a queued `Error` is thrown.
 */
const routedFetch = (routes: Routes) => {
  const next = (queue: unknown[] | undefined, path: string) => {
    if (!queue?.length) throw new Error(`Unexpected request: ${path}`);
    const response = queue.length > 1 ? queue.shift() : queue[0];
    if (response instanceof Error) throw response;
    return response;
  };
  return jest.fn().mockImplementation(async (path: string) => {
    if (path === '/internal/nightshift/investigations') return next(routes.start, path);
    if (path.startsWith('/internal/investigations/investigations/')) {
      return next(routes.investigation, path);
    }
    if (path.startsWith('/api/agent_builder/conversations/')) {
      return next(routes.conversation, path);
    }
    if (path.startsWith('/api/workflows/executions/')) return next(routes.execution, path);
    throw new Error(`Unexpected request: ${path}`);
  });
};

it('executes the manual investigation and reads what it recorded from the shared API', async () => {
  const conversation = withExecution({
    rounds: [
      {
        trace_id: ['first-trace', 'agent-trace'],
        started_at: '2026-01-01T00:00:01.000Z',
        model_usage: {
          connector_id: 'investigation-model',
          llm_calls: 3,
          input_tokens: 9_000,
          output_tokens: 700,
        },
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_call_id: 'call',
            tool_id: 'nightshift_sandbox_bash',
            params: { command: 'echo synthetic' },
            results: [
              {
                tool_result_id: 'result',
                type: ToolResultType.other,
                data: { stdout: 'a'.repeat(4_000) },
              },
            ],
          },
        ],
      },
    ],
  });
  const fetch = routedFetch({
    start: [{ investigation_id: 'investigation' }],
    investigation: [
      // The run has not created the conversation yet.
      notFound(),
      investigation({ in_progress: true }),
      investigation({
        severity: undefined,
        hypotheses: {
          hypotheses: [{ candidate: 'Load test', confidence: 0.9, status: 'confirmed' }],
          created_at: '2026-01-01T00:00:00.000Z',
        },
        proposals: [
          {
            id: 'p-1',
            title: 'Pause the load test',
            comment: 'Stop it',
            status: 'pending',
            impact: 'low',
            confidence: 'high',
            created_at: '2026-01-01T00:05:00.000Z',
          },
        ],
      } as Partial<Investigation>),
    ],
    conversation: [conversation],
    execution: [
      execution(ExecutionStatus.COMPLETED, [
        // The step's timeout wrapper repeats its id.
        { stepId: 'investigate', stepType: 'step_level_timeout', executionTimeMs: 240_010 },
        {
          stepId: 'investigate',
          stepType: 'ai.agent',
          startedAt: '2026-01-01T00:00:01.000Z',
          executionTimeMs: 240_000,
          usage: { inputTokens: 9_000, cachedTokens: 6_000, outputTokens: 700, totalTokens: 9_700 },
        },
      ]),
    ],
  });

  const result = await runInvestigation(fetch, example, connector);

  expect(fetch).toHaveBeenNthCalledWith(1, '/internal/nightshift/investigations', {
    method: 'POST',
    body: JSON.stringify({
      subject: { type: 'manual' },
      message: example.input.question,
      connector_id: connector.id,
    }),
  });
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    '/internal/investigations/investigations/investigation',
    {
      headers: { 'elastic-api-version': '1' },
    }
  );
  expect(fetch).toHaveBeenCalledWith('/api/workflows/executions/execution', {
    headers: { 'elastic-api-version': '2023-10-31' },
  });
  expect(result).toMatchObject({
    case_id: 'timeouts',
    investigation_id: 'investigation',
    conversation_id: 'investigation',
    workflow_status: 'complete',
    structured_report: {
      summary: 'Timeouts rose.',
      conclusion: 'Synthetic timeouts increased.',
      hypotheses: [expect.objectContaining({ candidate: 'Load test' })],
      proposals: [{ title: 'Pause the load test', comment: 'Stop it', status: 'pending' }],
    },
    traceId: 'agent-trace',
    trace_ids: ['first-trace', 'agent-trace'],
    conversation_round_count: 1,
    run_metrics: {
      requested_at: expect.any(String),
      time_to_report_ms: expect.any(Number),
      agent_steps: [
        {
          step_id: 'investigate',
          started_at: '2026-01-01T00:00:01.000Z',
          duration_ms: 240_000,
          input_tokens: 9_000,
          cached_input_tokens: 6_000,
          output_tokens: 700,
        },
      ],
      rounds: [{ started_at: '2026-01-01T00:00:01.000Z', llm_calls: 3, tool_calls: 1 }],
    },
  });
  expect(result.execution_error).toBeUndefined();
});

it('reads the report only after the workflow finishes, though a pending proposal ended in_progress', async () => {
  const fetch = routedFetch({
    start: [{ investigation_id: 'investigation' }],
    investigation: [
      // The agent created a proposal and is still recording its verdict.
      investigation({ metadata: { status: 'open', summary: 'Timeouts rose.' } }),
      investigation(),
    ],
    conversation: [withExecution({ rounds: [{ trace_id: 'agent-trace', steps: [] }] })],
    execution: [
      execution(ExecutionStatus.RUNNING),
      execution(ExecutionStatus.RUNNING),
      execution(ExecutionStatus.COMPLETED),
    ],
  });

  const output = await runInvestigation(fetch, example, connector);

  expect(output).toMatchObject({
    workflow_status: 'complete',
    structured_report: { conclusion: 'Synthetic timeouts increased.' },
    run_metrics: { time_to_report_ms: expect.any(Number), agent_steps: [] },
  });
  expect(output.execution_error).toBeUndefined();
  expect(
    fetch.mock.calls.filter(([path]) => path.startsWith('/api/workflows/executions/'))
  ).toHaveLength(3);
});

it('reports a workflow still running at the deadline without a time to report', async () => {
  const clock = jest
    .spyOn(Date, 'now')
    .mockReturnValueOnce(0)
    .mockReturnValue(INVESTIGATION_TIMEOUT_MS + 60_000);
  try {
    const fetch = routedFetch({
      start: [{ investigation_id: 'stuck' }],
      investigation: [investigation({ id: 'stuck' })],
      conversation: [withExecution({ rounds: [{ trace_id: 'partial-trace', steps: [] }] })],
      execution: [execution(ExecutionStatus.RUNNING)],
    });
    const output = await runInvestigation(fetch, example, connector);
    expect(output).toMatchObject({
      workflow_status: 'running',
      execution_error: 'Investigation workflow was still running after 30 minutes',
      traceId: 'partial-trace',
    });
    expect(output.run_metrics).not.toHaveProperty('time_to_report_ms');
  } finally {
    clock.mockRestore();
  }
});

it('keeps multi-megabyte conversation evidence out of the persisted score output', async () => {
  const conversation = {
    rounds: [
      {
        trace_id: 'agent-trace',
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            results: Array.from({ length: 4 }, () => ({
              type: ToolResultType.other,
              data: { content: 'é'.repeat(900_000) },
            })),
          },
        ],
      },
    ],
  };
  expect(Buffer.byteLength(JSON.stringify(conversation))).toBeGreaterThan(5 * 1024 * 1024);
  const fetch = routedFetch({
    start: [{ investigation_id: 'large-investigation' }],
    investigation: [investigation({ id: 'large-investigation' })],
    conversation: [conversation],
  });

  const output = await runInvestigation(fetch, example, connector);

  expect(output).not.toHaveProperty('conversation');
  expect(output).toMatchObject({
    investigation_id: 'large-investigation',
    conversation_id: 'large-investigation',
    conversation_round_count: 1,
    traceId: 'agent-trace',
  });
  expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(1024 * 1024);
});

it('bounds an oversized report while retaining evidence identifiers', async () => {
  const fetch = routedFetch({
    start: [{ investigation_id: 'large-report' }],
    investigation: [
      investigation({
        id: 'large-report',
        hypotheses: {
          hypotheses: Array.from({ length: 50 }, () => ({
            candidate: 'é'.repeat(10_000),
            confidence: 0.5,
            status: 'investigating' as const,
          })),
          created_at: '2026-01-01T00:00:00.000Z',
        },
      }),
    ],
    conversation: [{ rounds: [{ trace_id: 'partial-trace', steps: [] }] }],
  });

  const output = await runInvestigation(fetch, example, connector);

  expect(output).toMatchObject({
    investigation_id: 'large-report',
    traceId: 'partial-trace',
    report_truncated: true,
    structured_report: { conclusion: 'Synthetic timeouts increased.' },
  });
  expect(output.structured_report).not.toHaveProperty('hypotheses');
  expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(1024 * 1024);
});

it('reports an investigation that finished without a conclusion, keeping its evidence', async () => {
  const fetch = routedFetch({
    start: [{ investigation_id: 'no-verdict' }],
    investigation: [
      investigation({ id: 'no-verdict', metadata: { status: 'open', summary: 'Partial' } }),
    ],
    conversation: [{ rounds: [{ trace_id: 'partial-trace', steps: [] }] }],
  });

  const output = await runInvestigation(fetch, example, connector);

  expect(output).toMatchObject({
    workflow_status: 'complete',
    execution_error: 'Investigation finished without recording a conclusion',
    structured_report: { summary: 'Partial' },
    conversation_round_count: 1,
    traceId: 'partial-trace',
  });
  // Without a recorded workflow execution there is nothing to time the report against.
  expect(output.run_metrics).not.toHaveProperty('time_to_report_ms');
  const placeholder = await ungradedPlaceholder.evaluate({
    input: example.input,
    metadata: example.metadata,
    output,
    expected: undefined,
  });
  expect(placeholder).toMatchObject({ score: 1, label: 'ungraded' });
});

it('flags a finished investigation whose conversation never finished persisting', async () => {
  const fetch = routedFetch({
    start: [{ investigation_id: 'unpersisted' }],
    investigation: [investigation({ id: 'unpersisted' })],
    conversation: [
      {
        rounds: [
          { trace_id: 'partial-trace', status: ConversationRoundStatus.inProgress, steps: [] },
        ],
      },
    ],
  });

  expect(await runInvestigation(fetch, example, connector)).toMatchObject({
    workflow_status: 'complete',
    execution_error: UNPERSISTED_CONVERSATION_ERROR,
    conversation_round_count: 1,
    traceId: 'partial-trace',
  });
});

it('reports an investigation start failure as execution evidence', async () => {
  const output = await runInvestigation(
    jest.fn().mockRejectedValue(new Error('Service unavailable')),
    example,
    connector
  );
  expect(output.execution_error).toBe('Service unavailable');
  expect(output.investigation_id).toBeUndefined();
});

it('bounds a start failure even when no investigation was created', async () => {
  const output = await runInvestigation(
    jest.fn().mockRejectedValue(new Error('x'.repeat(6 * 1024 * 1024))),
    example,
    connector
  );
  expect(output.execution_error).toContain('[truncated]');
  expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(1024 * 1024);
  expect(output.investigation_id).toBeUndefined();
});

it('retains the latest report and conversation when a later poll fails', async () => {
  const fetch = routedFetch({
    start: [{ investigation_id: 'interrupted' }],
    investigation: [
      investigation({
        id: 'interrupted',
        in_progress: true,
        metadata: { status: 'open', summary: 'Partial report' },
      }),
      new Error('Polling failed'),
    ],
    conversation: [{ rounds: [{ trace_id: 'partial-trace', steps: [] }] }],
  });

  expect(await runInvestigation(fetch, example, connector)).toMatchObject({
    execution_error: 'Polling failed',
    workflow_status: 'running',
    structured_report: { summary: 'Partial report' },
    conversation_id: 'interrupted',
    traceId: 'partial-trace',
  });
});

it('bounds polling and retains partial conversation evidence when an investigation times out', async () => {
  const clock = jest
    .spyOn(Date, 'now')
    .mockReturnValueOnce(0)
    .mockReturnValue(INVESTIGATION_TIMEOUT_MS + 60_000);
  try {
    const fetch = routedFetch({
      start: [{ investigation_id: 'slow' }],
      investigation: [investigation({ id: 'slow', in_progress: true })],
      conversation: [{ rounds: [{ trace_id: 'partial-trace', steps: [] }] }],
    });
    expect(await runInvestigation(fetch, example, connector)).toMatchObject({
      investigation_id: 'slow',
      workflow_status: 'running',
      traceId: 'partial-trace',
      conversation_round_count: 1,
      execution_error: 'Investigation was still in progress after 30 minutes',
    });
  } finally {
    clock.mockRestore();
  }
});

it('reports an investigation that never appeared', async () => {
  const clock = jest
    .spyOn(Date, 'now')
    .mockReturnValueOnce(0)
    .mockReturnValue(INVESTIGATION_TIMEOUT_MS + 60_000);
  try {
    const fetch = routedFetch({
      start: [{ investigation_id: 'missing' }],
      investigation: [notFound()],
    });
    expect(await runInvestigation(fetch, example, connector)).toMatchObject({
      investigation_id: 'missing',
      execution_error: 'Investigation was not created within 30 minutes',
    });
  } finally {
    clock.mockRestore();
  }
});
