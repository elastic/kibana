/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { extractAccessedDecisionTrees } from './decision_tree_evidence';

let nextResultId = 0;

const viewFileStep = (
  filePath: string,
  result: { text: string } | { message: string }
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: `call-${++nextResultId}`,
  tool_id: 'nightshift_sandbox_view_file',
  params: { file_path: filePath },
  results: [
    {
      tool_result_id: `result-${nextResultId}`,
      type: 'text' in result ? ToolResultType.other : ToolResultType.error,
      data: result,
    },
  ],
});

const bashStep = (
  command: string,
  result: { exit_code: number; stdout?: string }
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: `call-${++nextResultId}`,
  tool_id: 'nightshift_sandbox_bash',
  params: { command },
  results: [{ tool_result_id: `result-${nextResultId}`, type: ToolResultType.other, data: result }],
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

  it('concatenates every successful view, in order, when a large tree is paginated', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { text: 'lines 1-100' }),
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { text: 'lines 101-200' }),
      ])
    );
    expect(trees).toEqual([{ tree_id: 'symptom:high-cpu', content: 'lines 1-100\nlines 101-200' }]);
  });

  it('does not count a failed read as having accessed the tree', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { message: 'File not found' }),
      ])
    );
    expect(trees).toEqual([]);
  });

  it('keeps a prior successful read when a later re-read of the same tree fails', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { text: 'good read' }),
        viewFileStep('decision-trees/decision_tree_high-cpu.md', { message: 'transient error' }),
      ])
    );
    expect(trees).toEqual([{ tree_id: 'symptom:high-cpu', content: 'good read' }]);
  });

  it('counts a bash command that reads a tree file, mirroring the server accessed-tree detector', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        bashStep('cat decision-trees/decision_tree_high-cpu.md', {
          exit_code: 0,
          stdout: '## Symptom: high CPU',
        }),
      ])
    );
    expect(trees).toEqual([{ tree_id: 'symptom:high-cpu', content: '## Symptom: high CPU' }]);
  });

  it('does not count a bash command that failed (non-zero exit) as having accessed the tree', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        bashStep('cat decision-trees/decision_tree_high-cpu.md', {
          exit_code: 1,
          stdout: '',
        }),
      ])
    );
    expect(trees).toEqual([]);
  });

  it('ignores tool calls whose command/path does not reference a decision tree file', () => {
    const trees = extractAccessedDecisionTrees(
      roundsOf([
        bashStep('ls decision-trees/', { exit_code: 0, stdout: 'monitors.md' }),
        viewFileStep('decision-trees/monitors.md', { text: 'index' }),
      ])
    );
    expect(trees).toEqual([]);
  });
});
