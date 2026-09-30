/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import { runInvestigation } from './task';
import { ungradedPlaceholder } from './placeholder';

const example = {
  input: { question: 'Investigate synthetic timeouts.' },
  metadata: { case_id: 'timeouts' },
};

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
    .mockResolvedValueOnce({
      status: 'completed',
      conversation_id: 'large-conversation',
      conclusion: 'The report remains available.',
    })
    .mockResolvedValueOnce(conversation);

  const output = await runInvestigation(fetch, example);

  expect(output).not.toHaveProperty('conversation');
  expect(output).toMatchObject({
    investigation_id: 'large-investigation',
    conversation_id: 'large-conversation',
    conversation_round_count: 1,
    traceId: 'agent-trace',
    structured_report: { conclusion: 'The report remains available.' },
  });
  expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(1024 * 1024);
  expect(conversation.rounds[0].steps[0].results[0].data.content).toHaveLength(900_000);
});

it('bounds an oversized report and failure message while retaining evidence identifiers', async () => {
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'large-report' })
    .mockResolvedValueOnce({
      status: 'failed',
      conversation_id: 'partial-conversation',
      summary: 'Partial report',
      conclusion: 'The report is stored on the investigation.',
      hypotheses: Array.from({ length: 50 }, () => ({
        candidate: 'é'.repeat(10_000),
        confidence: 0.5,
        status: 'investigating',
      })),
      error: 'x'.repeat(6 * 1024 * 1024),
    })
    .mockRejectedValueOnce(new Error('Workflow unavailable'))
    .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });

  const output = await runInvestigation(fetch, example);

  expect(output).toMatchObject({
    investigation_id: 'large-report',
    conversation_id: 'partial-conversation',
    traceId: 'partial-trace',
    workflow_status: 'failed',
    report_truncated: true,
    structured_report: {
      summary: 'Partial report',
      conclusion: 'The report is stored on the investigation.',
    },
  });
  expect(output.structured_report).not.toHaveProperty('hypotheses');
  expect(output.execution_error).toBeTruthy();
  expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(1024 * 1024);
});

it('executes the manual investigation and preserves the report and references to its conversation', async () => {
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
    .mockResolvedValueOnce({
      status: 'completed',
      conversation_id: 'conversation',
      conclusion: 'Synthetic timeouts increased.',
    })
    .mockResolvedValueOnce(conversation);

  const result = await runInvestigation(fetch, example);

  expect(fetch).toHaveBeenNthCalledWith(1, '/internal/nightshift/investigations', {
    method: 'POST',
    body: JSON.stringify({ subject: { type: 'manual' }, message: example.input.question }),
  });
  expect(result).toMatchObject({
    case_id: 'timeouts',
    investigation_id: 'investigation',
    conversation_id: 'conversation',
    workflow_status: 'completed',
    structured_report: { conclusion: 'Synthetic timeouts increased.' },
    traceId: 'agent-trace',
    conversation_round_count: 1,
  });
  expect(result.execution_error).toBeUndefined();
  expect(result.structured_report).not.toHaveProperty('trigger_feedback');
});

it.each([
  ['Workflow failed', 'Workflow failed'],
  [undefined, 'Investigation failed'],
])(
  'retains failed execution evidence even when workflow details are unavailable (%s)',
  async (error, expectedError) => {
    const conversation = { rounds: [{ trace_id: 'partial-trace', steps: [] }] };
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ investigation_id: 'failed-investigation' })
      .mockResolvedValueOnce({
        status: 'failed',
        conversation_id: 'partial-conversation',
        error,
        conclusion: 'Partial evidence',
      })
      .mockRejectedValueOnce(new Error('Workflow details unavailable'))
      .mockResolvedValueOnce(conversation);
    const output = await runInvestigation(fetch, example);
    expect(output).toMatchObject({
      workflow_status: 'failed',
      execution_error: expectedError,
      investigation_id: 'failed-investigation',
      conversation_id: 'partial-conversation',
      structured_report: { conclusion: 'Partial evidence' },
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
  }
);

it('reports an investigation start failure as execution evidence', async () => {
  const output = await runInvestigation(
    jest.fn().mockRejectedValue(new Error('Service unavailable')),
    example
  );
  expect(output.execution_error).toBe('Service unavailable');
  expect(output.investigation_id).toBeUndefined();
});

it('bounds a start failure even when no investigation was created', async () => {
  const output = await runInvestigation(
    jest.fn().mockRejectedValue(new Error('x'.repeat(6 * 1024 * 1024))),
    example
  );
  expect(output.execution_error).toContain('[truncated]');
  expect(Buffer.byteLength(JSON.stringify(output))).toBeLessThan(1024 * 1024);
  expect(output.investigation_id).toBeUndefined();
});

it('reports a completed investigation without a conversation as an execution error', async () => {
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'no-conversation' })
    .mockResolvedValueOnce({ status: 'completed', conclusion: 'Report without trace evidence' });
  const output = await runInvestigation(fetch, example);
  expect(output.execution_error).toBe('Completed investigation has no conversation id');
  expect(output.traceId).toBeUndefined();
});

it('retains the latest report and conversation when a later poll fails', async () => {
  const fetch = jest
    .fn()
    .mockResolvedValueOnce({ investigation_id: 'interrupted-investigation' })
    .mockResolvedValueOnce({
      status: 'running',
      conversation_id: 'partial-conversation',
      summary: 'Partial report',
    })
    .mockRejectedValueOnce(new Error('Polling failed'))
    .mockRejectedValueOnce(new Error('Workflow details unavailable'))
    .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });
  expect(await runInvestigation(fetch, example)).toMatchObject({
    execution_error: 'Polling failed',
    workflow_status: 'running',
    structured_report: { summary: 'Partial report' },
    conversation_id: 'partial-conversation',
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
      .mockResolvedValueOnce({ investigation_id: 'slow-investigation' })
      .mockResolvedValueOnce({ status: 'running', conversation_id: 'slow-conversation' })
      .mockRejectedValueOnce(new Error('Workflow details unavailable'))
      .mockResolvedValueOnce({ rounds: [{ trace_id: 'partial-trace', steps: [] }] });
    expect(await runInvestigation(fetch, example)).toMatchObject({
      investigation_id: 'slow-investigation',
      conversation_id: 'slow-conversation',
      workflow_status: 'running',
      traceId: 'partial-trace',
      conversation_round_count: 1,
      execution_error: 'Investigation did not reach a terminal status within 20 minutes',
    });
  } finally {
    clock.mockRestore();
  }
});
