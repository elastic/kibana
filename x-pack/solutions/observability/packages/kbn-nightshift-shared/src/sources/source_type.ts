/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { z } from '@kbn/zod/v4';

/**
 * Kinds of data a Nightshift source may target. `unknown` is a real value: an index that matches
 * none of the others, including a wildcard such as `*`.
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
 * Metrics are not configurable: a metrics source is a `TS` command or a `metrics` / `metricbeat` name.
 */
export interface SourceTypePatterns {
  logs: readonly string[];
  traces: readonly string[];
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
  metrics: () => [],
};

/**
 * Every known type `name` matches. Empty means `unknown`. A name may match more than one type;
 * callers reject that instead of picking one.
 */
export const matchSourceTypes = ({
  name,
  patterns = DEFAULT_SOURCE_TYPE_PATTERNS,
}: {
  name: string;
  patterns?: SourceTypePatterns;
}): KnownSourceType[] =>
  KNOWN_SOURCE_TYPES.filter((type) =>
    testPatternAgainstAllowedList([
      BASE_PATTERN_REGEXP[type],
      ...configuredPatterns[type](patterns),
    ])(name)
  );

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
