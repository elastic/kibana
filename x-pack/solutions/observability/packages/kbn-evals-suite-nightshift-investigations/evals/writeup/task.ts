/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
// Eval tooling, not Kibana runtime code: the cache lives in the repository's data directory.
// eslint-disable-next-line @kbn/eslint/require_kbn_fs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { setTimeout } from 'timers/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  MessageRole,
  ToolChoiceType,
  type BoundInferenceClient,
  type Message,
  type ToolCall,
} from '@kbn/inference-common';
import { RECORDING_TOOL, buildReplay, safeToolName, type Replay } from './replay';
import {
  defaultReplyType,
  type GeneratedReply,
  type ReplyAttachment,
  type WriteupExample,
  type WriteupTaskOutput,
} from './types';

export const INVESTIGATOR_PROMPT_PATH =
  'x-pack/solutions/observability/plugins/nightshift_investigations/server/agents/investigation/instructions/investigator.md.text';

/** Generations are cached here (gitignored), so a re-run with another judge only makes judge calls. */
export const WRITEUP_DATA_DIR = join(REPO_ROOT, 'data', 'nightshift_writeup');

export interface PromptArm {
  /** `current`, a git ref, or a file name. */
  label: string;
  prompt: string;
  hash: string;
}

export const hashText = (text: string): string =>
  createHash('sha256').update(text).digest('hex').slice(0, 12);

/**
 * The investigator prompt to replay with. Without a spec it is the working tree's, so the eval
 * measures the checkout it runs from. A spec is a prompt file, or else a git ref whose prompt is
 * read with `git show`.
 */
export const loadPromptArm = (spec?: string, repoRoot = REPO_ROOT): PromptArm => {
  let label = 'current';
  let prompt: string;
  if (!spec) {
    prompt = readFileSync(join(repoRoot, INVESTIGATOR_PROMPT_PATH), 'utf8');
  } else if (existsSync(resolve(spec))) {
    label = spec.split('/').at(-1)!;
    prompt = readFileSync(resolve(spec), 'utf8');
  } else {
    label = spec;
    prompt = execFileSync('git', ['show', `${spec}:${INVESTIGATOR_PROMPT_PATH}`], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
  }
  return { label, prompt, hash: hashText(prompt) };
};

const MAX_EXTRA_CALLS = 6;
const MAX_FAILURES = 3;
const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Agent Builder offers this on every conversation, whether or not the recorded run used it. */
const ATTACHMENTS_ADD = safeToolName('attachments.add');

/**
 * The result a replayed tool call gets. An attachment is kept, so a judge can read what the reply
 * shows. Other recording calls succeed. Queries can't run in a replay, so they get "No new
 * results": an error that named the replay came back in replies as "Let me finalize my reply".
 */
const replayToolResult = (
  name: string,
  args: Record<string, unknown>,
  attachments: ReplyAttachment[]
): Record<string, unknown> => {
  if (name === ATTACHMENTS_ADD) {
    const id = `replay-attachment-${attachments.length + 1}`;
    let data: unknown = args.data;
    try {
      data = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      // keep the raw string
    }
    const content = (data as { content?: unknown } | undefined)?.content;
    attachments.push({
      id,
      type: String(args.type ?? 'text'),
      content: typeof content === 'string' ? content : JSON.stringify(data ?? {}),
    });
    return { attachment_id: id, type: args.type ?? 'text', version: 1 };
  }
  return RECORDING_TOOL.test(name) ? { result: 'ok' } : { result: 'No new results.' };
};

/**
 * Asks the model for its next message, as the agent loop would. The model may still call tools
 * first, as it can in production: often a last recording call or an attachment before it
 * replies. The loop stops at the first reply with text, after at most six extra calls.
 */
export const replayReply = async (
  inferenceClient: Pick<BoundInferenceClient, 'chatComplete'>,
  replay: Replay,
  { retryDelayMs = 4_000 }: { retryDelayMs?: number } = {}
): Promise<GeneratedReply> => {
  // Schemas stay loose so no call fails validation; the model only needs the names.
  const tools = Object.fromEntries(
    [...new Set([...replay.toolNames, ATTACHMENTS_ADD])].map((name) => [
      name,
      {
        description:
          name === ATTACHMENTS_ADD
            ? 'Add an attachment to the conversation: { type, data }.'
            : `Investigation tool ${name}.`,
        schema: { type: 'object', properties: {} },
      },
    ])
  ) as Record<string, { description: string; schema: { type: 'object'; properties: {} } }>;
  const messages: Message[] = [...replay.messages];
  const extraCalls: string[] = [];
  const attachments: ReplyAttachment[] = [];
  let lastError = '';
  for (let calls = 0, failures = 0; calls < MAX_EXTRA_CALLS && failures < MAX_FAILURES; ) {
    try {
      const response = await inferenceClient.chatComplete({
        system: replay.system,
        messages,
        tools,
        toolChoice: ToolChoiceType.auto,
      });
      const text = String(response.content ?? '').trim();
      const toolCalls: ToolCall[] = response.toolCalls ?? [];
      if (!toolCalls.length) {
        if (countWords(text) >= 8 || /render_attachment/.test(text)) {
          return {
            reply: text,
            extra_calls: extraCalls,
            ...(attachments.length ? { attachments } : {}),
          };
        }
        lastError = text ? `short reply: ${text}` : 'empty reply';
        failures++;
        continue;
      }
      calls++;
      messages.push({ role: MessageRole.Assistant, content: text || null, toolCalls });
      for (const call of toolCalls) {
        extraCalls.push(call.function.name);
        const args = (
          typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments || '{}')
            : call.function.arguments ?? {}
        ) as Record<string, unknown>;
        messages.push({
          role: MessageRole.Tool,
          name: call.function.name,
          toolCallId: call.toolCallId,
          response: replayToolResult(call.function.name, args, attachments),
        });
      }
    } catch (error) {
      lastError = String((error as Error).message ?? error).slice(0, 300);
      failures++;
      await setTimeout(retryDelayMs * failures);
    }
  }
  return {
    extra_calls: extraCalls,
    error: lastError || `no reply after ${extraCalls.length} extra calls`,
  };
};

/** A JSON file cache keyed by content hash. Failed generations aren't cached. */
export const createGenerationCache = (dir = join(WRITEUP_DATA_DIR, 'cache')) => ({
  key: (parts: string[]) => hashText(['v2', ...parts].join('\n')),
  read(key: string): GeneratedReply | undefined {
    const file = join(dir, `${key}.json`);
    return existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as GeneratedReply)
      : undefined;
  },
  write(key: string, value: GeneratedReply) {
    if (!value.reply) return;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${key}.json`), JSON.stringify(value));
  },
});

export type GenerationCache = ReturnType<typeof createGenerationCache>;

/**
 * Replays one round under the prompt (and the baseline prompt, when there is one). Repetitions of
 * an example are separate samples, so each gets its own cache entry.
 */
export const createWriteupTask = ({
  inferenceClient,
  connectorId,
  arm,
  baseline,
  cache,
}: {
  inferenceClient: Pick<BoundInferenceClient, 'chatComplete'>;
  connectorId: string;
  arm: PromptArm;
  baseline?: PromptArm;
  cache?: GenerationCache;
}) => {
  const samples = new Map<string, number>();
  const generate = async (
    example: WriteupExample,
    replay: Replay,
    sample: number
  ): Promise<GeneratedReply> => {
    const key = cache?.key([example.metadata.case_id, connectorId, replay.system, String(sample)]);
    const hit = key ? cache?.read(key) : undefined;
    if (hit) return { ...hit, cached: true };
    const out = await replayReply(inferenceClient, replay);
    if (key) cache?.write(key, out);
    return out;
  };

  return async (example: WriteupExample): Promise<WriteupTaskOutput> => {
    const { rounds, round_index: roundIndex } = example.input;
    const sample = samples.get(example.metadata.case_id) ?? 0;
    samples.set(example.metadata.case_id, sample + 1);
    const replay = buildReplay(rounds, roundIndex, arm.prompt);
    const [current, base] = await Promise.all([
      generate(example, replay, sample),
      baseline
        ? generate(example, buildReplay(rounds, roundIndex, baseline.prompt), sample)
        : undefined,
    ]);
    return {
      case_id: example.metadata.case_id,
      round_index: roundIndex,
      reply_type: example.metadata.reply_type ?? defaultReplyType(roundIndex),
      question: replay.question,
      recorded_reply: example.output.recorded_reply,
      replay_chars: replay.chars,
      prompt_hash: arm.hash,
      ...current,
      ...(base && baseline ? { baseline: { ...base, prompt_hash: baseline.hash } } : {}),
    };
  };
};
