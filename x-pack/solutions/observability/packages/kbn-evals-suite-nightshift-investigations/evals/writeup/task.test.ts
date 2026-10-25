/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MessageRole } from '@kbn/inference-common';
import { buildReplay } from './replay';
import {
  INVESTIGATOR_PROMPT_PATH,
  createGenerationCache,
  createWriteupTask,
  loadPromptArm,
  replayReply,
} from './task';
import type { WriteupExample } from './types';

const example: WriteupExample = {
  input: {
    rounds: [
      {
        input: { message: 'Why did checkout fail?' },
        steps: [
          {
            type: 'tool_call',
            tool_id: 'nightshift_sandbox_bash',
            tool_call_id: 'c1',
            params: {},
            results: [{ data: '127 errors' }],
          },
        ],
      },
    ],
    round_index: 0,
  },
  output: { recorded_reply: 'Payment failed.' },
  metadata: { case_id: 'case/r1', conversation_case_id: 'case', round_index: 0 },
};

const REPLY = 'Payment DNS lookups failed, so checkout returned errors for an hour.';
const reply = (content: string) => ({ content, toolCalls: [] });
const call = (name: string) => ({
  content: '',
  toolCalls: [{ toolCallId: `t-${name}`, function: { name, arguments: {} } }],
});

const fakeClient = (responses: unknown[]) => {
  const chatComplete = jest.fn();
  for (const r of responses) {
    if (r instanceof Error) chatComplete.mockRejectedValueOnce(r);
    else chatComplete.mockResolvedValueOnce(r);
  }
  return { chatComplete };
};

describe('replayReply', () => {
  const replay = buildReplay(example.input.rounds, 0, 'prompt');

  it('returns the first reply with text', async () => {
    const client = fakeClient([reply(REPLY)]);
    await expect(replayReply(client, replay)).resolves.toEqual({ reply: REPLY, extra_calls: [] });
    expect(client.chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'prompt', toolChoice: 'auto' })
    );
  });

  it('acknowledges recording calls, refuses queries, then takes the reply', async () => {
    const client = fakeClient([
      call('agentic_investigations_set_hypotheses'),
      call('nightshift_sandbox_bash'),
      reply(REPLY),
    ]);
    const out = await replayReply(client, replay);
    expect(out).toEqual({
      reply: REPLY,
      extra_calls: ['agentic_investigations_set_hypotheses', 'nightshift_sandbox_bash'],
    });
    const { messages } = client.chatComplete.mock.calls[2][0];
    const toolMessages = messages.filter((m: { role: string }) => m.role === MessageRole.Tool);
    expect(toolMessages.at(-2).response).toEqual({ result: 'ok' });
    expect(toolMessages.at(-1).response.error).toMatch(/Not available in this replay/);
  });

  it('retries a short reply and a failed call, then gives up with the last error', async () => {
    const client = fakeClient([reply('ok'), new Error('gateway 502'), reply('')]);
    await expect(replayReply(client, replay, { retryDelayMs: 0 })).resolves.toEqual({
      extra_calls: [],
      error: 'empty reply',
    });
    expect(client.chatComplete).toHaveBeenCalledTimes(3);
  });
});

describe('createWriteupTask', () => {
  const arm = { label: 'current', prompt: 'prompt', hash: 'h1' };

  it('rewrites the reply under the current and baseline prompts and caches each sample', async () => {
    const cache = createGenerationCache(mkdtempSync(join(tmpdir(), 'writeup-')));
    const client = fakeClient([
      reply(REPLY),
      reply(`${REPLY} Baseline.`),
      reply(`${REPLY} Again.`),
      reply(`${REPLY} Again base.`),
    ]);
    const task = createWriteupTask({
      inferenceClient: client,
      connectorId: 'model',
      arm,
      baseline: { label: 'main', prompt: 'old prompt', hash: 'h0' },
      cache,
    });
    const first = await task(example);
    expect(first).toMatchObject({
      case_id: 'case/r1',
      round_index: 0,
      question: 'Why did checkout fail?',
      recorded_reply: 'Payment failed.',
      prompt_hash: 'h1',
      baseline: { prompt_hash: 'h0' },
    });
    expect([first.reply, first.baseline?.reply].sort()).toEqual(
      [REPLY, `${REPLY} Baseline.`].sort()
    );
    // A second repetition is a new sample, so it generates again.
    const second = await task(example);
    expect(second.cached).toBeUndefined();
    expect(client.chatComplete).toHaveBeenCalledTimes(4);

    // A fresh task (a re-run) reads both samples from the cache.
    const rerun = createWriteupTask({
      inferenceClient: fakeClient([]),
      connectorId: 'model',
      arm,
      baseline: { label: 'main', prompt: 'old prompt', hash: 'h0' },
      cache,
    });
    await expect(rerun(example)).resolves.toMatchObject({ reply: first.reply, cached: true });
  });
});

describe('loadPromptArm', () => {
  it('reads the working tree prompt by default, or a file', () => {
    const root = mkdtempSync(join(tmpdir(), 'writeup-root-'));
    const promptFile = join(root, 'prompt.md');
    writeFileSync(promptFile, 'file prompt');
    expect(loadPromptArm(promptFile, root)).toMatchObject({
      label: 'prompt.md',
      prompt: 'file prompt',
    });
    expect(() => loadPromptArm(undefined, root)).toThrow(
      INVESTIGATOR_PROMPT_PATH.split('/').at(-1)
    );
  });
});
