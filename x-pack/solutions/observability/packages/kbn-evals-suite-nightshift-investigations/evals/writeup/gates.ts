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
  /** The same, in attachments the reply created and shows. */
  attachmentUngroundedNumbers: string[];
  /** Emojis in the reply; the prompt rules them out for every reply type. */
  emojis: string[];
}

export interface ReplyGateOptions {
  /**
   * Numbers in the recorded tool parameters, such as a query's `LIMIT 1000`. They ground numbers
   * inside code only, so a quoted query passes while a count in the prose still needs a result.
   */
  queryNumbers?: Set<string>;
  /** Contents of the attachments the reply created and shows; their numbers are checked too. */
  attachments?: readonly string[];
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
// Pictographs such as ✅, ⚠️ and 🔴. ©, ® and ™ are pictographic in Unicode but read as text.
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/gu;
export const NUMBER = /\d[\d,]*(\.\d+)?/g;
/** `6,600` and `6600` are the same number. */
export const normalizeNumber = (n: string) => n.replace(/,/g, '');

// Fenced blocks (closed or not) and inline code spans.
const CODE = /```[\s\S]*?(?:```|$)|`[^`\n]+`/g;
// An inline span counts as a quoted query only when it reads like one: `LIMIT 1000` does, `1000` doesn't.
const QUERY_LIKE =
  /\|\s*[A-Z]+\b|\b(?:FROM|WHERE|LIMIT|STATS|BUCKET|EVAL|KEEP|SORT|DATE_TRUNC|GET|POST|size|interval)\b/;
const isQuotedQuery = (code: string) => code.startsWith('```') || QUERY_LIKE.test(code);

const ungroundedIn = (text: string, known: Set<string>): string[] =>
  (text.match(NUMBER) ?? [])
    .map(normalizeNumber)
    .filter((n) => n.replace(/\D/g, '').length >= 2)
    .filter(
      (n) =>
        !known.has(n) &&
        !isDerivedNumber(n, known, {
          percent: new RegExp(`${n.replace('.', '\\.')}\\s?%`).test(text),
        })
    );

/**
 * Numbers of two or more digits in `text` that the agent can't have got from what it saw. Prose
 * and code are checked against `known`; quoted queries also against `queryNumbers`, the literals of
 * recorded queries.
 */
export const findUngroundedNumbers = (
  text: string,
  known: Set<string>,
  queryNumbers?: Set<string>
): string[] => {
  const spans = text.match(CODE) ?? [];
  // Only quoted queries may repeat a query's literals; other code spans are checked like prose,
  // so formatting a count as `1000` doesn't ground it.
  const queries = spans.filter(isQuotedQuery).join('\n');
  const otherCode = spans.filter((s) => !isQuotedQuery(s)).join('\n');
  const prose = plain(text.replace(CODE, ' '));
  const queryKnown = queryNumbers?.size ? new Set([...known, ...queryNumbers]) : known;
  return [
    ...new Set([
      ...ungroundedIn(prose, known),
      ...ungroundedIn(otherCode, known),
      ...ungroundedIn(queries, queryKnown),
    ]),
  ];
};

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

/**
 * True when `n` is a number the agent can work out from ones it saw: one of them rounded, or, when
 * it's a percentage or has decimals, the ratio of two ("9.3%" from 30 of 321). Sums and
 * differences aren't counted: with a few thousand numbers in the results, almost any integer is one.
 */
export const isDerivedNumber = (
  n: string,
  known: Set<string>,
  { percent = false }: { percent?: boolean } = {}
): boolean => {
  const x = Number(n);
  if (!Number.isFinite(x)) return false;
  const decimals = n.split('.')[1]?.length ?? 0;
  const tolerance = 0.5 * 10 ** -decimals + 1e-9;
  const near = (v: number) => Math.abs(v - x) <= tolerance;
  const values = [...new Set([...known].map(Number).filter(Number.isFinite))];
  if (values.some(near)) return true;
  if (!percent && !decimals) return false;
  return values.some((a) =>
    values.some((b) => b !== 0 && (percent ? near((a / b) * 100) : near(a / b)))
  );
};

export const runReplyGates = (
  reply: string,
  type: ReplyType,
  known: Set<string>,
  { queryNumbers, attachments = [] }: ReplyGateOptions = {}
): ReplyGates => {
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
  // "The table above" is fine when the reply has an inline table to point at.
  const mentions = tables ? reply.replace(/\bthe table above\b/gi, '') : reply;
  const attachmentUnshown = !attachmentShown && MENTIONS_ATTACHMENT.test(mentions);
  const method = [...new Set([...reply.matchAll(METHOD)].map((m) => m[0]))];
  const ungroundedNumbers = findUngroundedNumbers(reply, known, queryNumbers);
  // An attachment is exempt from the word caps, not from grounding.
  const attachmentUngroundedNumbers = [
    ...new Set(attachments.flatMap((a) => findUngroundedNumbers(a, known, queryNumbers))),
  ];

  const emojis = [...new Set(reply.match(EMOJI) ?? [])];

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
    attachmentUngroundedNumbers,
    emojis,
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
  if (emojis.length) failed.push(`emojis: ${emojis.join(' ')}`);
  if (attachmentUnshown) failed.push("mentions an attachment it doesn't show");
  if (ungroundedNumbers.length) {
    failed.push(`ungrounded numbers: ${ungroundedNumbers.slice(0, 5).join(', ')}`);
  }
  if (attachmentUngroundedNumbers.length) {
    failed.push(
      `ungrounded numbers in an attachment: ${attachmentUngroundedNumbers.slice(0, 5).join(', ')}`
    );
  }
  return { pass: failed.length === 0, failed, metrics };
};
