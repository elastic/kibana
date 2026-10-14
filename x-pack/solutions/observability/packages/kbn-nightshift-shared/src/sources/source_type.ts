/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Kinds of data a Nightshift source may target. `unknown` is a real value: an index that
 * matches none of the others. An unscoped wildcard is rejected on its own, by
 * {@link isUnscopedIndexPattern} through `analyzeSourceQuery`.
 */
export const SOURCE_TYPES = ['logs', 'metrics', 'traces', 'unknown'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const sourceTypeSchema = z.enum(SOURCE_TYPES);

/** A type an index name can match. `unknown` is the absence of these, not a pattern. */
export type KnownSourceType = Exclude<SourceType, 'unknown'>;

const KNOWN_SOURCE_TYPES = SOURCE_TYPES.filter(
  (type): type is KnownSourceType => type !== 'unknown'
);

/**
 * Base names per type. The logs and traces lists mirror Discover's profiles
 * (`DEFAULT_ALLOWED_LOGS_BASE_PATTERNS` and its traces twin in `@kbn/discover-utils`); keep them
 * in sync by hand, this package must not depend on Discover. `metrics_data_access` defaults to
 * `metrics-*,metricbeat-*`. Discover only treats a `TS` command as metrics, so the metrics
 * names are what lets `FROM metrics-*` be metrics too.
 */
const BASE_PATTERNS: Record<KnownSourceType, readonly string[]> = {
  logs: ['log', 'logs', 'logstash', 'auditbeat', 'filebeat', 'winlogbeat'],
  traces: ['trace', 'traces'],
  metrics: ['metrics', 'metricbeat'],
};

const NAME_CHARACTERS = '[^:,\\s]+';
const SEGMENT_BOUNDARY = '(?:\\b|_)';

/**
 * Same shape as Discover's `createRegExpPatternFrom(bases, 'data')` for a single name: optional
 * cluster prefix, optional leading word, a base name, optional trailing word, optional `::data`.
 */
const baseNameRegExp = (bases: readonly string[]): RegExp =>
  new RegExp(
    `^(?:${NAME_CHARACTERS}:)?(?:${NAME_CHARACTERS}${SEGMENT_BOUNDARY})?(?:${bases.join(
      '|'
    )})(?:${SEGMENT_BOUNDARY}${NAME_CHARACTERS})?(?:::data)?$`,
    'i'
  );

/** `logs` / `metrics` / `traces` as a whole `-` or `:` delimited token, not `logstash`. */
const segmentRegExp = (type: KnownSourceType): RegExp =>
  new RegExp(`(?:^|[-:])${type}(?=$|-)`, 'i');

const BASE_PATTERN_REGEXP: Record<KnownSourceType, RegExp> = {
  logs: baseNameRegExp(BASE_PATTERNS.logs),
  metrics: baseNameRegExp(BASE_PATTERNS.metrics),
  traces: baseNameRegExp(BASE_PATTERNS.traces),
};

const DATA_SELECTOR = /::data$/i;

/**
 * `::data` is the default selector, so `logs-*::data` is the same name as `logs-*`. Any other
 * selector (`::failures`) addresses different documents and is left in place, so it does not
 * match a base name and the index classifies as `unknown`.
 */
const stripDataSelector = (name: string): string => name.replace(DATA_SELECTOR, '');

const typeSegments = (name: string): KnownSourceType[] => {
  const stripped = stripDataSelector(name);
  return KNOWN_SOURCE_TYPES.filter((type) => segmentRegExp(type).test(stripped));
};

/**
 * Every known type `name` matches. Empty means `unknown`. A name may match more than one type;
 * callers reject that instead of picking one. Data streams are `<type>-<dataset>-<namespace>`,
 * so a `-` delimited `logs` / `metrics` / `traces` token breaks a tie: `metrics-logstash.*` is
 * metrics and `logs-foo.metrics-*` is logs. Two such tokens (`logs-traces-*`) stay ambiguous.
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
