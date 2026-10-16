/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { runInvestigation } from './task';
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

const notFound = () => Object.assign(new Error('Not Found'), { response: { status: 404 } });

it('executes the manual investigation and reads what it recorded from the shared API', async () => {
  const conversation = {
    rounds: [
      {
        trace_id: ['first-trace', 'agent-trace'],
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
  };
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'investigation' })
    // The run has not created the conversation yet.
    .mockRejectedValueOnce(notFound())
    .mockResolvedValueOnce(investigation({ in_progress: true }))
    .mockResolvedValueOnce(
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
      } as Partial<Investigation>)
    )
    .mockResolvedValueOnce(conversation);

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
    conversation_round_count: 1,
  });
  expect(result.execution_error).toBeUndefined();
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
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'large-investigation' })
    .mockResolvedValueOnce(investigation({ id: 'large-investigation' }))
    .mockResolvedValueOnce(conversation);

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
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'large-report' })
    .mockResolvedValueOnce(
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
      })
    )
    .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });

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
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'no-verdict' })
    .mockResolvedValueOnce(
      investigation({ id: 'no-verdict', metadata: { status: 'open', summary: 'Partial' } })
    )
    .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });

  const output = await runInvestigation(fetch, example, connector);

  expect(output).toMatchObject({
    workflow_status: 'complete',
    execution_error: 'Investigation finished without recording a conclusion',
    structured_report: { summary: 'Partial' },
    conversation_round_count: 1,
    traceId: 'partial-trace',
  });
  const placeholder = await ungradedPlaceholder.evaluate({
    input: example.input,
    metadata: example.metadata,
    output,
    expected: undefined,
  });
  expect(placeholder).toMatchObject({ score: 1, label: 'ungraded' });
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
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'interrupted' })
    .mockResolvedValueOnce(
      investigation({
        id: 'interrupted',
        in_progress: true,
        metadata: { status: 'open', summary: 'Partial report' },
      })
    )
    .mockRejectedValueOnce(new Error('Polling failed'))
    .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });

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
    .mockReturnValue(21 * 60_000);
  try {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ investigation_id: 'slow' })
      .mockResolvedValueOnce(investigation({ id: 'slow', in_progress: true }))
      .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });
    expect(await runInvestigation(fetch, example, connector)).toMatchObject({
      investigation_id: 'slow',
      workflow_status: 'running',
      traceId: 'partial-trace',
      conversation_round_count: 1,
      execution_error: 'Investigation was still in progress after 20 minutes',
    });
  } finally {
    clock.mockRestore();
  }
});

it('reports an investigation that never appeared', async () => {
  const clock = jest
    .spyOn(Date, 'now')
    .mockReturnValueOnce(0)
    .mockReturnValue(21 * 60_000);
  try {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ investigation_id: 'missing' })
      .mockRejectedValue(notFound());
    expect(await runInvestigation(fetch, example, connector)).toMatchObject({
      investigation_id: 'missing',
      execution_error: 'Investigation was not created within 20 minutes',
    });
  } finally {
    clock.mockRestore();
  }
});
