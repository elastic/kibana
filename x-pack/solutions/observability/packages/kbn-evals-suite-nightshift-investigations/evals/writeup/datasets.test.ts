/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { toWriteupConversation } from './build';
import { isLongReplyType } from './types';
import {
  ORCA_WRITEUP_DATASET,
  loadWriteupDataset,
  readOrcaWriteupFile,
  toWriteupDataset,
  toWriteupExamples,
  type WriteupConversation,
} from './datasets';

const exported = [
  {
    id: 'r1',
    status: 'completed',
    input: { message: 'Why did checkout fail?' },
    steps: [
      { type: 'reasoning', reasoning: 'Look at payment.' },
      {
        type: 'tool_call',
        tool_id: 'nightshift_sandbox_bash',
        tool_call_id: 'c1',
        params: { command: 'curl ...' },
        results: [{ type: 'other', data: { stdout: 'z'.repeat(50) } }],
        progression: [{ message: 'dropped' }],
      },
      { type: 'other_step', anything: true },
    ],
    response: { message: 'Payment DNS failed.' },
    model_usage: { input_tokens: 1 },
  },
  {
    id: 'r2',
    status: 'completed',
    input: { message: 'Charged?' },
    steps: [],
    response: { message: 'No.' },
  },
  { id: 'r3', status: 'in_progress', input: { message: 'Still?' }, steps: [] },
];

describe('toWriteupConversation', () => {
  it('keeps finished rounds, reasoning and tool calls, and clips long results', () => {
    const conversation = toWriteupConversation('case', exported, {
      resultCap: 20,
      goldens: [
        { round_index: 1, reply: 'No one was charged.', source: 'variant-b' },
        { round_index: 2, reply: 'dropped', source: 'variant-b' },
      ],
    });
    expect(conversation.rounds).toHaveLength(2);
    expect(conversation.rounds[0]).toEqual({
      id: 'r1',
      input: { message: 'Why did checkout fail?' },
      steps: [
        { type: 'reasoning', reasoning: 'Look at payment.' },
        {
          type: 'tool_call',
          tool_id: 'nightshift_sandbox_bash',
          tool_call_id: 'c1',
          params: { command: 'curl ...' },
          results: [
            {
              type: 'other',
              data: `${`{"stdout":"${'z'.repeat(50)}"}`.slice(0, 20)} …[truncated]`,
            },
          ],
        },
      ],
      response: { message: 'Payment DNS failed.' },
    });
    expect(conversation.goldens).toEqual([
      { round_index: 1, reply: 'No one was charged.', source: 'variant-b' },
    ]);
  });

  it('keeps the numbers that clipping removed, for the grounding gate', () => {
    const [round] = toWriteupConversation(
      'case',
      [
        {
          ...exported[0],
          steps: [
            {
              type: 'tool_call',
              tool_id: 'nightshift_sandbox_bash',
              results: [{ data: `kept 12 ${'.'.repeat(30)} lost 4,031 and 12 and 7` }],
            },
          ],
        },
      ],
      { resultCap: 20 }
    ).rounds;
    expect(round.clipped_numbers).toEqual(['4031']);
  });

  it('keeps a short result as recorded', () => {
    const [round] = toWriteupConversation('case', exported).rounds;
    expect(round.steps[1].results).toEqual([{ type: 'other', data: { stdout: 'z'.repeat(50) } }]);
  });
});

describe('toWriteupExamples', () => {
  const conversation: WriteupConversation = toWriteupConversation('case', exported, {
    goldens: [{ round_index: 1, reply: 'No one was charged.', source: 'variant-b' }],
  });

  it('makes one example per replied round, holding its reply out', () => {
    const examples = toWriteupExamples(conversation);
    expect(examples.map((e) => e.metadata.case_id)).toEqual(['case/r1', 'case/r2']);
    const [, second] = examples;
    expect(second.input.round_index).toBe(1);
    expect(second.input.rounds).toHaveLength(2);
    expect(second.input.rounds[1].response).toBeUndefined();
    expect(second.input.rounds[0].response).toEqual({ message: 'Payment DNS failed.' });
    expect(second.output).toEqual({ recorded_reply: 'No.', golden: 'No one was charged.' });
    expect(second.metadata).toMatchObject({
      golden_source: 'variant-b',
      conversation_case_id: 'case',
    });
  });

  it('tags each round with the reply its question calls for', () => {
    const tagged = toWriteupExamples({
      ...conversation,
      reply_types: [{ round_index: 1, type: 'action' }],
    });
    expect(tagged.map((e) => e.metadata.reply_type)).toEqual(['wrapup', 'action']);
    expect(toWriteupExamples(conversation).map((e) => e.metadata.reply_type)).toEqual([
      'wrapup',
      'answer',
    ]);
  });

  it('adds a follow-up question after the last answered round, with no recorded reply', () => {
    const examples = toWriteupExamples({
      ...conversation,
      follow_ups: [{ message: 'Walk me through it step by step.', type: 'detail' }],
    });
    const followUp = examples.at(-1)!;
    expect(followUp.metadata).toMatchObject({
      case_id: 'case/more1',
      round_index: 2,
      reply_type: 'detail',
    });
    expect(followUp.output).toEqual({ recorded_reply: '' });
    expect(followUp.input.rounds).toHaveLength(3);
    expect(followUp.input.rounds[1].response).toEqual({ message: 'No.' });
    expect(followUp.input.rounds[2]).toEqual({
      input: { message: 'Walk me through it step by step.' },
      steps: [],
    });
  });

  it('rewrites only the last round when asked', () => {
    expect(toWriteupExamples(conversation, 'last').map((e) => e.metadata.case_id)).toEqual([
      'case/r2',
    ]);
  });
});

describe('toWriteupDataset', () => {
  it('tags the dataset and rejects duplicate case ids', () => {
    const conversation = toWriteupConversation('case', exported);
    const file = {
      dataset: 'nightshift/x',
      tags: [],
      rounds: 'all' as const,
      conversations: [conversation],
    };
    expect(toWriteupDataset(file).tags).toEqual(['nightshift', 'writeup']);
    expect(() =>
      toWriteupDataset({ ...file, conversations: [conversation, conversation] })
    ).toThrow('Duplicate case_id: case/r1');
  });

  it('refuses a dataset the upsert route would reject', () => {
    const huge = toWriteupConversation('huge', [
      { ...exported[0], steps: [{ type: 'reasoning', reasoning: 'x'.repeat(5 * 1024 * 1024) }] },
    ]);
    expect(() =>
      toWriteupDataset({ dataset: 'nightshift/x', tags: [], rounds: 'all', conversations: [huge] })
    ).toThrow('the upsert limit is 5 MiB');
  });
});

describe('loadWriteupDataset', () => {
  const client = { getDatasetByName: jest.fn() };

  it('reads a private conversations file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'writeup-'));
    const path = join(dir, 'c0.json');
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/writeup-c0',
        rounds: 'last',
        conversations: [toWriteupConversation('c0', exported)],
      })
    );
    const dataset = await loadWriteupDataset(client, { examplesFile: path });
    expect(dataset.name).toBe('nightshift/writeup-c0');
    expect(dataset.examples.map((e) => e.metadata.case_id)).toEqual(['c0/r2']);
  });

  it('reads a stored dataset by name and validates its examples', async () => {
    const [example] = toWriteupExamples(toWriteupConversation('c0', exported));
    client.getDatasetByName.mockResolvedValueOnce({
      id: 'd',
      name: 'nightshift/stored',
      description: 'd',
      examples: [{ ...example, id: 'e1' }],
    });
    const dataset = await loadWriteupDataset(client, { datasetName: 'nightshift/stored' });
    expect(dataset.examples[0]).toMatchObject({ id: 'e1', metadata: { case_id: 'c0/r1' } });

    client.getDatasetByName.mockResolvedValueOnce(null);
    await expect(loadWriteupDataset(client, { datasetName: 'missing' })).rejects.toThrow(
      'Writeup dataset not found: missing'
    );
  });

  it('refuses both a stored name and a file', async () => {
    await expect(
      loadWriteupDataset(client, { datasetName: 'a', examplesFile: 'b' })
    ).rejects.toThrow('not both');
  });
});

describe('the committed ORCA conversations', () => {
  const file = readOrcaWriteupFile();
  const dataset = toWriteupDataset(file);

  it('are synthetic, multi-round and fit one dataset upsert', () => {
    expect(dataset.name).toBe(ORCA_WRITEUP_DATASET);
    expect(file.conversations.length).toBeGreaterThanOrEqual(4);
    for (const conversation of file.conversations) {
      expect(conversation.case_id).toMatch(/^orca-/);
      // The investigation, then at least one follow-up question.
      expect(conversation.rounds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('have a golden for every recorded round', () => {
    expect(
      dataset.examples
        .filter((e) => e.output.recorded_reply && !e.output.golden)
        .map((e) => e.metadata.case_id)
    ).toEqual([]);
  });

  it('include requests for more, which no recorded round makes', () => {
    const long = dataset.examples.filter((e) => isLongReplyType(e.metadata.reply_type ?? 'answer'));
    expect(new Set(long.map((e) => e.metadata.reply_type))).toEqual(
      new Set(['detail', 'list', 'method', 'visual'])
    );
  });
});
