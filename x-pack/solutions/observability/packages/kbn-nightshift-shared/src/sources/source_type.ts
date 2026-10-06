/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRegExpPatternFrom } from '@kbn/data-view-utils';
import { z } from '@kbn/zod/v4';

/**
 * Kinds of data a Nightshift source may target. `unknown` is a real value: an index that
 * matches none of the others. An unscoped wildcard is rejected on its own.
 */
export const SOURCE_TYPES = ['logs', 'metrics', 'traces', 'unknown'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const sourceTypeSchema = z.enum(SOURCE_TYPES);

/** A type an index name can match. `unknown` is the absence of these, not a pattern. */
type KnownSourceType = Exclude<SourceType, 'unknown'>;

const KNOWN_SOURCE_TYPES = [
  'logs',
  'traces',
  'metrics',
] as const satisfies readonly KnownSourceType[];

/**
 * Index patterns configured for a deployment, on top of the built-in base patterns.
 * `metrics` comes from the APM metric index setting. A `TS` command is metrics even when
 * this list is empty.
 */
export interface SourceTypePatterns {
  logs: readonly string[];
  traces: readonly string[];
  metrics?: readonly string[];
}

/** The four APM index settings that name a kind of data. Onboarding and sourcemap are unused. */
export interface ApmIndexPatternFields {
  transaction: string;
  span: string;
  error: string;
  metric: string;
}

/** No configured patterns. Classification then uses only the built-in base patterns. */
export const DEFAULT_SOURCE_TYPE_PATTERNS: SourceTypePatterns = { logs: [], traces: [] };

/**
 * Same bases Discover's logs profile matches (`DEFAULT_ALLOWED_LOGS_BASE_PATTERNS` in
 * `@kbn/discover-utils`). Copied so this package does not depend on Discover.
 */
export const DEFAULT_LOGS_BASE_PATTERNS = [
  'log',
  'logs',
  'logstash',
  'auditbeat',
  'filebeat',
  'winlogbeat',
] as const;

/** Same bases Discover's traces profile matches when APM indices are unavailable. */
export const DEFAULT_TRACES_BASE_PATTERNS = ['trace', 'traces'] as const;

/**
 * `metrics_data_access` defaults to `metrics-*,metricbeat-*`. Discover itself only treats a `TS`
 * command as metrics, so these names are what lets `FROM metrics-*` be metrics too.
 */
export const DEFAULT_METRICS_BASE_PATTERNS = ['metrics', 'metricbeat'] as const;

const BASE_PATTERN_REGEXP: Record<KnownSourceType, RegExp> = {
  logs: createRegExpPatternFrom([...DEFAULT_LOGS_BASE_PATTERNS], 'data'),
  traces: createRegExpPatternFrom([...DEFAULT_TRACES_BASE_PATTERNS], 'data'),
  metrics: createRegExpPatternFrom([...DEFAULT_METRICS_BASE_PATTERNS], 'data'),
};

// Keying by type makes this exhaustive: TypeScript errors if a known type has no configured list.
const configuredPatterns: Record<
  KnownSourceType,
  (patterns: SourceTypePatterns) => readonly string[]
> = {
  logs: (patterns) => patterns.logs,
  traces: (patterns) => patterns.traces,
  metrics: (patterns) => patterns.metrics ?? [],
};

const DATA_SELECTOR = /::data$/i;

/** `::data` is the default selector, so `my-app-*::data` is the same name as `my-app-*`. */
const stripDataSelector = (name: string): string => name.replace(DATA_SELECTOR, '');

/**
 * True when `name` matches `pattern` as an Elasticsearch index pattern (`*` and `?`).
 * A configured log source of `my-app-*` covers `my-app-0001` and `my-app-frontend-*`.
 */
const indexPatternMatches = (pattern: string, name: string): boolean => {
  const expression = stripDataSelector(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${expression}$`, 'i').test(stripDataSelector(name));
};

const TYPE_SEGMENT_REGEXP: Record<KnownSourceType, RegExp> = {
  logs: /(?:^|[^a-z0-9])logs(?=$|[^a-z0-9])/i,
  traces: /(?:^|[^a-z0-9])traces(?=$|[^a-z0-9])/i,
  metrics: /(?:^|[^a-z0-9])metrics(?=$|[^a-z0-9])/i,
};

/** `logs` / `metrics` / `traces` as whole segments. `logstash` and `transaction_log` are not. */
const typeSegments = (name: string): KnownSourceType[] => {
  const stripped = stripDataSelector(name);
  return KNOWN_SOURCE_TYPES.filter((type) => TYPE_SEGMENT_REGEXP[type].test(stripped));
};

const matchesKnownType = (
  name: string,
  type: KnownSourceType,
  patterns: SourceTypePatterns
): boolean => {
  if (BASE_PATTERN_REGEXP[type].test(name)) {
    return true;
  }
  return configuredPatterns[type](patterns).some((token) => indexPatternMatches(token, name));
};

/**
 * Every known type `name` matches. Empty means `unknown`. A name may match more than one type;
 * callers reject that instead of picking one. One `logs` / `metrics` / `traces` segment wins
 * over a dataset token (`metrics-logstash.*` is metrics). Two of those segments stay ambiguous.
 */
export const matchSourceTypes = ({
  name,
  patterns = DEFAULT_SOURCE_TYPE_PATTERNS,
}: {
  name: string;
  patterns?: SourceTypePatterns;
}): KnownSourceType[] => {
  const matched = KNOWN_SOURCE_TYPES.filter((type) => matchesKnownType(name, type, patterns));
  // A segment only breaks ties, so skip the scan when there is nothing to break.
  if (matched.length < 2) {
    return matched;
  }
  const segments = typeSegments(name);
  if (segments.length === 1 && matched.includes(segments[0])) {
    return [segments[0]];
  }
  return matched;
};

/** A leading `*` can match every kind of data (`*`, `*-*`, `*log*`). */
export const isUnscopedIndexPattern = (name: string): boolean =>
  stripDataSelector(name).startsWith('*');

/**
 * Splits a comma-separated index pattern list. Tokens starting with `-` are exclusions
 * (`-logstash*` in the default log sources) and are not index names, so they are dropped.
 */
export const toSourceTypePatternTokens = (indexPatterns: string): string[] =>
  indexPatterns
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !token.startsWith('-'));

/** {@link toSourceTypePatternTokens} across several pattern lists, without duplicates. */
export const uniqueSourceTypePatternTokens = (indexPatterns: readonly string[]): string[] => [
  ...new Set(indexPatterns.flatMap(toSourceTypePatternTokens)),
];

/** Splits APM index settings into the kind each setting names. A shared token stays on every kind. */
export const patternsFromApmIndices = ({
  transaction,
  span,
  error,
  metric,
}: ApmIndexPatternFields): SourceTypePatterns => ({
  logs: toSourceTypePatternTokens(error),
  traces: uniqueSourceTypePatternTokens([transaction, span]),
  metrics: toSourceTypePatternTokens(metric),
});

const NO_APM_PATTERNS: SourceTypePatterns = { logs: [], traces: [], metrics: [] };

/**
 * Reads configured log sources and APM indices in parallel and merges them into patterns. A
 * reader that is not given contributes nothing. The same token on two kinds stays on both.
 * Failure handling (a forbidden APM read, for example) belongs in the reader.
 */
export const loadSourceTypePatterns = async ({
  readLogSources,
  readApmIndices,
}: {
  /** Comma-separated log source index patterns. */
  readLogSources?: () => Promise<string>;
  readApmIndices?: () => Promise<ApmIndexPatternFields>;
}): Promise<SourceTypePatterns> => {
  const [logSources, apmIndices] = await Promise.all([readLogSources?.(), readApmIndices?.()]);
  const apm = apmIndices ? patternsFromApmIndices(apmIndices) : NO_APM_PATTERNS;
  return {
    logs: [...new Set([...toSourceTypePatternTokens(logSources ?? ''), ...apm.logs])],
    traces: apm.traces,
    metrics: apm.metrics,
  };
};
