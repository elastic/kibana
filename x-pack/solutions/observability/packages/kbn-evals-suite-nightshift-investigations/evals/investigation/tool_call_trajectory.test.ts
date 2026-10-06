/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { extractToolCallTrajectory } from './tool_call_trajectory';

let nextId = 0;

const toolCallStep = (
  toolId: string,
  params: Record<string, unknown>,
  data: Record<string, unknown>,
  type: ToolResultType = ToolResultType.other
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: `call-${++nextId}`,
  tool_id: toolId,
  params,
  results: [{ tool_result_id: `result-${nextId}`, type, data }],
});

const roundsOf = (steps: ConversationRoundStep[]): Array<Pick<ConversationRound, 'steps'>> => [
  { steps },
];

describe('extractToolCallTrajectory', () => {
  it('returns nothing when there are no tool calls', () => {
    expect(extractToolCallTrajectory(roundsOf([]))).toEqual([]);
  });

  it('renders a view-file result as its text', () => {
    const trajectory = extractToolCallTrajectory(
      roundsOf([
        toolCallStep(
          'nightshift_sandbox_view_file',
          { file_path: 'decision-trees/decision_tree_high-cpu.md' },
          { text: '## Symptom: high CPU' }
        ),
      ])
    );
    expect(trajectory).toEqual([
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: 'decision-trees/decision_tree_high-cpu.md' },
        result: '## Symptom: high CPU',
      },
    ]);
  });

  it('renders a bash result as its exit code, stdout and stderr', () => {
    const trajectory = extractToolCallTrajectory(
      roundsOf([
        toolCallStep(
          'nightshift_sandbox_bash',
          { command: 'esql ...' },
          { exit_code: 0, stdout: 'cpu.pct 92', stderr: '' }
        ),
      ])
    );
    expect(trajectory[0].result).toBe('exit_code: 0 | stdout: cpu.pct 92');
  });

  it('renders an error result as its message', () => {
    const trajectory = extractToolCallTrajectory(
      roundsOf([
        toolCallStep(
          'nightshift_sandbox_bash',
          { command: 'false' },
          { message: 'command failed' },
          ToolResultType.error
        ),
      ])
    );
    expect(trajectory[0].result).toBe('Error: command failed');
  });

  it('preserves call order across multiple rounds', () => {
    const trajectory = extractToolCallTrajectory([
      { steps: [toolCallStep('tool_a', {}, { text: 'first' })] },
      { steps: [toolCallStep('tool_b', {}, { text: 'second' })] },
    ]);
    expect(trajectory.map((step) => step.tool_id)).toEqual(['tool_a', 'tool_b']);
  });
});
