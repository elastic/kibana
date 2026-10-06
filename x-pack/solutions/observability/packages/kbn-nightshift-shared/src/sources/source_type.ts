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

/** Same bases Discover's traces profile matches. */
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

const DATA_SELECTOR = /::data$/i;

/** `::data` is the default selector, so `logs-*::data` is the same name as `logs-*`. */
const stripDataSelector = (name: string): string => name.replace(DATA_SELECTOR, '');

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

/**
 * Every known type `name` matches. Empty means `unknown`. A name may match more than one type;
 * callers reject that instead of picking one. One `logs` / `metrics` / `traces` segment wins
 * over a dataset token (`metrics-logstash.*` is metrics). Two of those segments stay ambiguous.
 */
export const matchSourceTypes = (name: string): KnownSourceType[] => {
  const matched = KNOWN_SOURCE_TYPES.filter((type) => BASE_PATTERN_REGEXP[type].test(name));
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
