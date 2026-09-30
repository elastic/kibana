/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { extractAccessedDecisionTrees } from './decision_tree_evidence';

const viewFileStep = (
  filePath: string,
  result: { text: string } | { message: string }
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'call-1',
  tool_id: 'nightshift_sandbox_view_file',
  params: { file_path: filePath },
  results: [
    {
      tool_result_id: 'result-1',
      type: 'text' in result ? ToolResultType.other : ToolResultType.error,
      data: result,
    },
  ],
});

const roundsOf = (steps: ConversationRoundStep[]): Array<Pick<ConversationRound, 'steps'>> => [
  { steps },
];

describe('extractAccessedDecisionTrees', () => {
  it('returns nothing when no decision tree file was viewed', () => {
    expect(extractAccessedDecisionTrees(roundsOf([]))).toEqual([]);
    expect(
      extractAccessedDecisionTrees(
        roundsOf([viewFileStep('decision-trees/monitors.md', { text: 'index' })])
      )
    ).toEqual([]);
  });

  it('extracts the tree id and content from a viewed decision tree file', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        viewFileStep('decision-trees/decision_tree_kafka-consumer-lag.md', {
          text: '1. Check consumer group lag.',
        }),
      ])
    );
    expect(trees).toEqual([
      { tree_id: 'symptom:kafka-consumer-lag', content: '1. Check consumer group lag.' },
    ]);
  });

  it('keeps the last successful view when a tree is opened more than once', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { text: 'first read' }),
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { text: 'second read' }),
      ])
    );
    expect(trees).toEqual([{ tree_id: 'symptom:high-cpu', content: 'second read' }]);
  });

  it('records an empty content string when the view call errored', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { message: 'File not found' }),
      ])
    );
    expect(trees).toEqual([{ tree_id: 'symptom:high-cpu', content: '' }]);
  });

  it('ignores tool calls that are not the sandbox view-file tool', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-2',
          tool_id: 'nightshift_sandbox_bash',
          params: { command: 'cat decision-trees/decision_tree_high-cpu.md' },
          results: [
            { tool_result_id: 'result-2', type: ToolResultType.other, data: { text: 'ignored' } },
          ],
        },
      ])
    );
    expect(trees).toEqual([]);
  });
});
