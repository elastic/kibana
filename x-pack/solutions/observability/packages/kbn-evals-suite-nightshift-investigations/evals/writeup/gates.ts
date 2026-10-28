/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Deterministic checks on a free-text chat reply, the way a reader gets it. Nothing here relies
// on a schema: the lead, the points and the length are read off the markdown the model wrote.
// Table rows and `<render_attachment>` tags aren't prose, so they don't count toward its length.
// Short replies get the strict shape; a reply to a request for more gets a word cap and nothing
// else on its shape, since a list, a walk-through or the queries behind a result need room.

import { isLongReplyType, type ReplyType } from './types';

export interface ReplyGateMetrics {
  words: number;
  /** Words in the first sentence of the first prose line. */
  leadWords: number;
  /** Bullet or numbered lines. */
  points: number;
  sentences: number;
  /** Share (0–1) of sentences of 20 words or fewer. */
  within20: number;
  headings: number;
  tables: boolean;
  /** Markdown table rows in the reply, header included, separator rows not. */
  tableRows: number;
  /** The reply shows an attachment with a `<render_attachment>` tag. */
  attachmentShown: boolean;
  /** The reply mentions an attachment ("attached", "the table above") without showing one. */
  attachmentUnshown: boolean;
  /** Method narration found, such as "I queried". */
  method: string[];
  /** Numbers of two or more digits that appear nowhere in what the agent saw. */
  ungroundedNumbers: string[];
}

export interface ReplyGates {
  pass: boolean;
  failed: string[];
  metrics: ReplyGateMetrics;
}

export const REPLY_GATE_LIMITS = {
  minWords: 8,
  maxWords: 100,
  maxLeadWords: 22,
  maxPoints: 3,
  /** A first-round wrap-up without points. */
  maxWrapUpSentences: 4,
  minWithin20: 0.9,
  /** About ten rows plus the header; a longer table belongs in an attachment. */
  maxTableRows: 12,
} as const;

/** Word cap by reply type, not counting table rows or attachments. */
export const REPLY_MAX_WORDS: Record<ReplyType, number> = {
  wrapup: REPLY_GATE_LIMITS.maxWords,
  answer: REPLY_GATE_LIMITS.maxWords,
  summary: REPLY_GATE_LIMITS.maxWords,
  action: REPLY_GATE_LIMITS.maxWords,
  method: 300,
  list: 200,
  detail: 400,
  visual: 150,
};

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
const RENDER_ATTACHMENT = /<render_attachment\b[^>]*\/?>/g;
const plain = (text: string) =>
  text
    .replace(RENDER_ATTACHMENT, '')
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/;
const MENTIONS_ATTACHMENT = /\b(attached|attachment|the table above|chart above)\b/i;
const BULLET = /^\s*([-*•]|\d+[.)])\s+/;
// "**Root cause:**" on its own, or opening a paragraph, works as a heading.
const HEADING = /^(#{1,6}\s|\*\*[^*\n]{2,40}:\*\*)/;
const METHOD =
  /\bI(?:'ve| have)? (queried|ran|re-?checked|checked|pulled|looked|searched|grepped|counted|confirmed through)\b/gi;
export const NUMBER = /\d[\d,]*(\.\d+)?/g;
/** `6,600` and `6600` are the same number. */
export const normalizeNumber = (n: string) => n.replace(/,/g, '');

export const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9`"(])|\n+/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) >= 3);

/** Numbers the agent saw, with and without thousands separators. */
export const knownNumbers = (corpus: string): Set<string> =>
  new Set([
    ...(corpus.match(NUMBER) ?? []).map(normalizeNumber),
    ...(corpus.match(/\d+(\.\d+)?/g) ?? []),
  ]);

export const runReplyGates = (reply: string, type: ReplyType, known: Set<string>): ReplyGates => {
  const long = isLongReplyType(type);
  const all = reply
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() && !/^\s*<render_attachment\b/.test(l));
  // A short Markdown table is allowed in the reply, so its rows count toward neither words nor
  // sentences; only its size is checked.
  const tableRows = all.filter((l) => TABLE_ROW.test(l) && !TABLE_SEPARATOR.test(l)).length;
  const lines = all.filter((l) => !TABLE_ROW.test(l));
  const firstProse = lines.find((l) => !BULLET.test(l) && !/^#{1,6}\s/.test(l)) ?? lines[0] ?? '';
  const lead = splitSentences(plain(firstProse.replace(HEADING, '')))[0] ?? '';
  const points = lines.filter((l) => BULLET.test(l)).length;
  const sentences = splitSentences(
    plain(lines.map((l) => l.replace(BULLET, '').replace(HEADING, '')).join('\n'))
  );
  const within20 = sentences.length
    ? sentences.filter((s) => countWords(s) <= 20).length / sentences.length
    : 1;
  const headings = lines.filter((l) => HEADING.test(l.trim())).length;
  const tables = tableRows > 0;
  // A reply that points at an attachment it never shows leaves the reader with nothing.
  const attachmentShown = new RegExp(RENDER_ATTACHMENT.source).test(reply);
  const attachmentUnshown = !attachmentShown && MENTIONS_ATTACHMENT.test(reply);
  const method = [...new Set([...reply.matchAll(METHOD)].map((m) => m[0]))];
  const numbers = (plain(reply).match(NUMBER) ?? [])
    .map(normalizeNumber)
    .filter((n) => n.replace(/\D/g, '').length >= 2);
  const ungroundedNumbers = [...new Set(numbers.filter((n) => !known.has(n)))];

  const metrics: ReplyGateMetrics = {
    words: countWords(plain(lines.join('\n'))),
    leadWords: countWords(lead),
    points,
    sentences: sentences.length,
    within20,
    headings,
    tables,
    tableRows,
    attachmentShown,
    attachmentUnshown,
    method,
    ungroundedNumbers,
  };
  const limits = REPLY_GATE_LIMITS;
  const failed: string[] = [];
  // A table or an attachment can carry the answer on its own.
  if (metrics.words < limits.minWords && !tableRows && !attachmentShown) {
    failed.push(`only ${metrics.words} words`);
  }
  if (metrics.words > REPLY_MAX_WORDS[type]) failed.push(`${metrics.words} words`);
  if (metrics.leadWords > limits.maxLeadWords) {
    failed.push(`first sentence ${metrics.leadWords} words`);
  }
  if (!long) {
    if (type === 'wrapup' && !points && sentences.length > limits.maxWrapUpSentences) {
      failed.push(`wrap-up ${sentences.length} sentences`);
    }
    if (points > limits.maxPoints) failed.push(`${points} points`);
    if (within20 < limits.minWithin20) {
      failed.push(`sentences ≤20 words ${Math.round(within20 * 100)}%`);
    }
    if (headings) failed.push(`${headings} headings`);
  }
  if (tableRows > limits.maxTableRows) failed.push(`table of ${tableRows} rows in the reply`);
  // Saying how a result was produced is the answer to a method question.
  if (method.length && type !== 'method') failed.push(`method: ${method.join(', ')}`);
  if (attachmentUnshown) failed.push("mentions an attachment it doesn't show");
  if (ungroundedNumbers.length) {
    failed.push(`ungrounded numbers: ${ungroundedNumbers.slice(0, 5).join(', ')}`);
  }
  return { pass: failed.length === 0, failed, metrics };
};
