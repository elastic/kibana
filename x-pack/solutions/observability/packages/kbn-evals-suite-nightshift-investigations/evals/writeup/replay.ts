/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Rebuilds what the model saw just before it wrote the chat message that closed a round, so a
// prompt version can write that message again. This is the final turn of the agent loop itself,
// not a write-up after the fact:
//
// - system: the investigator prompt under test, placeholders filled;
// - history: every earlier round as Agent Builder renders it, with the user message, each tool
//   call and its result, and the reply that closed it;
// - the replayed round: the user message, then every tool call and result in it, including the
//   agent's own recording calls;
// - output: free text, with no schema, as the model would write it.
//
// What stays different from production: Agent Builder wraps the prompt in its own system
// instructions and compacts long history its own way, the model's earlier thinking isn't replayed,
// and tool calls stay as recorded, so a prompt that would have queried differently can't show it.

import { MessageRole, type Message, type ToolCall } from '@kbn/inference-common';
import { stepsFromRound } from '@kbn/nightshift-investigations-plugin/server/investigation_round/round_loader';
import type { RecordedRound, ReplyAttachment } from './types';

export interface Replay {
  system: string;
  messages: Message[];
  /** Every tool the agent called anywhere in the conversation, as model-safe names. */
  toolNames: string[];
  /** The replayed round's user message, without the context the product appends to it. */
  question: string;
  roundIndex: number;
  /** Characters of rendered history, after clipping. */
  chars: number;
}

/**
 * The investigator prompt as the agent type builds it for a run without decision trees or Semantic
 * Memory, which is how the eval clusters run. Custom context isn't appended.
 */
export const fillPrompt = (prompt: string): string =>
  prompt
    .replace('{{decision_trees_load_step}}', '')
    .replace('{{semantic_memory_load_step}}', '')
    .replace('{{decision_trees_section}}', '');

/** Tool names must match `^[a-zA-Z0-9_-]+$` for the model APIs. */
export const safeToolName = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);

/** The agent's own reporting tools. In a replay they succeed without doing anything. */
export const RECORDING_TOOL =
  /set_conversation_metadata|set_impact|set_hypotheses|proposals|attachments|todos|progress_report/;

/** Keep the history within one model context; earlier rounds are clipped first, as compaction would. */
const TOTAL_BUDGET = 420_000;
const RESULT_CAP = 20_000;
const PRIOR_ROUND_CAPS = [4_000, 1_500, 400];
const REPLAYED_ROUND_CAPS = [8_000, 3_000];

/** The product appends trigger context after three blank lines; the question is what comes before. */
export const questionOf = (message: string): string => message.split('\n\n\n')[0].trim();

/** A tool result as the model reads it: the first result's data, as text. */
export const resultText = (results: unknown[] | undefined): string => {
  const first = results?.[0] as { data?: unknown } | undefined;
  if (!first) return '';
  return typeof first.data === 'string' ? first.data : JSON.stringify(first.data ?? null);
};

const clip = (text: string, cap: number) =>
  text.length > cap ? `${text.slice(0, cap)} …[truncated]` : text;

/** Builds the replay of round `roundIndex`: everything before its reply. */
export const buildReplay = (
  rounds: readonly RecordedRound[],
  roundIndex: number,
  prompt: string
): Replay => {
  if (roundIndex < 0 || roundIndex >= rounds.length) {
    throw new Error(`Round ${roundIndex} is out of range for ${rounds.length} rounds`);
  }
  const kept = rounds.slice(0, roundIndex + 1);
  const steps = kept.map((round) => stepsFromRound(round.steps));
  const toolNames = [
    ...new Set(steps.flat().flatMap((s) => (s.kind === 'tool' ? [safeToolName(s.toolId)] : []))),
  ];

  const render = (capFor: (round: number) => number): Message[] => {
    const messages: Message[] = [];
    kept.forEach((round, i) => {
      messages.push({ role: MessageRole.User, content: round.input.message });
      let reasoning: string | null = null;
      steps[i].forEach((step, j) => {
        // Visible reasoning rides on the next tool call, as Agent Builder renders it.
        if (step.kind === 'reasoning') {
          reasoning = [reasoning, step.text].filter(Boolean).join('\n');
          return;
        }
        const name = safeToolName(step.toolId);
        const toolCallId = step.toolCallId ?? `replay-${i}-${j}`;
        const toolCall: ToolCall = { toolCallId, function: { name, arguments: step.params } };
        messages.push({ role: MessageRole.Assistant, content: reasoning, toolCalls: [toolCall] });
        reasoning = null;
        messages.push({
          role: MessageRole.Tool,
          name,
          toolCallId,
          response: { result: clip(resultText(step.results), capFor(i)) },
        });
      });
      // Earlier rounds close with the reply the agent sent; the replayed round's reply is what
      // the model writes again.
      if (i < roundIndex) {
        messages.push({ role: MessageRole.Assistant, content: round.response?.message ?? '' });
      }
    });
    return messages;
  };

  const size = (messages: Message[]) => JSON.stringify(messages).length;
  let messages = render(() => RESULT_CAP);
  for (const cap of PRIOR_ROUND_CAPS) {
    if (size(messages) <= TOTAL_BUDGET) break;
    messages = render((i) => (i < roundIndex ? cap : RESULT_CAP));
  }
  for (const cap of REPLAYED_ROUND_CAPS) {
    if (size(messages) <= TOTAL_BUDGET) break;
    messages = render((i) => (i < roundIndex ? PRIOR_ROUND_CAPS.at(-1)! : cap));
  }

  return {
    system: fillPrompt(prompt),
    messages,
    toolNames,
    question: questionOf(rounds[roundIndex].input.message),
    roundIndex,
    chars: size(messages),
  };
};

/**
 * Everything the agent saw up to the replayed round, for grounding checks: the user messages,
 * every tool result, and the numbers clipped out of stored results.
 */
export const replayCorpus = (rounds: readonly RecordedRound[], roundIndex: number): string =>
  rounds
    .slice(0, roundIndex + 1)
    .flatMap((round) => [
      round.input.message,
      ...stepsFromRound(round.steps).flatMap((s) =>
        s.kind === 'tool' ? [JSON.stringify(s.results ?? '')] : []
      ),
      ...(round.clipped_numbers ?? []),
    ])
    .join('\n');

/** The replay history as text, for a judge to read. The end (the replayed round) stays whole. */
export const replayText = (replay: Replay, budget = 300_000): string => {
  const text = replay.messages
    .map((m) => {
      if (m.role === MessageRole.User) return `## USER\n${m.content}`;
      if (m.role === MessageRole.Tool) {
        return `RESULT ${m.toolCallId}:\n${String((m.response as { result?: unknown }).result)}`;
      }
      const [call] = m.toolCalls ?? [];
      return call
        ? `CALL ${call.toolCallId} ${call.function.name}: ${JSON.stringify(
            call.function.arguments
          ).slice(0, 4_000)}`
        : `## AGENT REPLY\n${m.content}`;
    })
    .join('\n\n');
  return text.length > budget ? `…[earlier history cut]\n${text.slice(-budget)}` : text;
};

type Params = Record<string, unknown>;

/**
 * What the investigation panel shows when the replayed round's reply is written: the latest
 * summary, verdict and severity, impact, hypotheses and proposed actions, from the agent's own
 * recording calls. The reader has it open, so a judge needs it to tell what a reply adds.
 */
export const panelText = (rounds: readonly RecordedRound[], roundIndex: number): string => {
  const calls = rounds
    .slice(0, roundIndex + 1)
    .flatMap((round) => stepsFromRound(round.steps))
    .flatMap((s) =>
      s.kind === 'tool' ? [{ id: s.toolId, params: (s.params ?? {}) as Params }] : []
    );
  const last = (pattern: RegExp) => [...calls].reverse().find((c) => pattern.test(c.id))?.params;
  // Metadata calls may set one field at a time, so merge them in order.
  const meta: Params = {};
  for (const c of calls) {
    if (/set_conversation_metadata$/.test(c.id)) Object.assign(meta, c.params.metadata ?? {});
  }
  const impact = last(/set_impact$/);
  const hypotheses = (last(/set_hypotheses$/)?.hypotheses ?? []) as Params[];
  const proposals = calls
    .filter((c) => /proposals[._]create$/.test(c.id))
    .map((c) => c.params.title);
  const parts = [
    meta.severity && `Severity: ${meta.severity}`,
    meta.summary && `Summary: ${meta.summary}`,
    meta.verdict && `Verdict: ${meta.verdict}`,
    impact?.summary && `Impact: ${impact.summary}`,
    hypotheses.length &&
      `Hypotheses:\n${hypotheses
        .map((h) => `- [${h.status}, ${h.confidence}] ${h.candidate}: ${h.reason ?? ''}`)
        .join('\n')}`,
    proposals.length && `Proposed actions:\n${proposals.map((t) => `- ${t}`).join('\n')}`,
  ].filter(Boolean);
  return parts.length ? parts.join('\n\n') : '(nothing recorded yet)';
};

/** Attachments the recorded rounds created, which a replayed reply may show again. */
export const recordedAttachments = (
  rounds: readonly RecordedRound[],
  roundIndex: number
): ReplyAttachment[] =>
  rounds
    .slice(0, roundIndex + 1)
    .flatMap((round) => stepsFromRound(round.steps))
    .flatMap((s) => {
      if (s.kind !== 'tool' || !/attachments[._]add$/.test(s.toolId)) return [];
      const result = (s.results?.[0] as { data?: { attachment_id?: string } } | undefined)?.data;
      if (!result?.attachment_id) return [];
      const params = (s.params ?? {}) as Params;
      const data = params.data as { content?: unknown } | undefined;
      return [
        {
          id: result.attachment_id,
          type: String(params.type ?? 'text'),
          content: typeof data?.content === 'string' ? data.content : JSON.stringify(data ?? {}),
        },
      ];
    });

/**
 * A reply as a judge reads it: each attachment it shows written out where its tag sits, so a reply
 * that shows a table or chart isn't read as empty, and a tag with nothing behind it reads as such.
 */
export const expandAttachments = (reply: string, attachments: readonly ReplyAttachment[]): string =>
  reply.replace(/<render_attachment\s+id="([^"]+)"[^>]*\/?>/g, (_tag, id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    return attachment
      ? `[Attachment shown inline (${attachment.type}):\n${attachment.content.slice(0, 3_000)}\n]`
      : '[Attachment tag with no attachment behind it]';
  });
