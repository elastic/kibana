/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import type { ESQLCommand, ESQLSource } from '@elastic/esql/types';
import {
  isUnscopedIndexPattern,
  matchSourceTypes,
  SOURCE_TYPES,
  type SourceType,
} from './source_type';
import { NIGHTSHIFT_SOURCE_VIEW_PREFIX } from './view_name';

const SOURCE_COMMANDS = new Set(['from', 'ts']);
const ALLOWED_PROCESSING_COMMANDS = new Set(['where']);
// Drop the trailing `.` so `$.nightshift.sources` and `$.nightshift.sources*` match too.
const NIGHTSHIFT_SOURCE_VIEW_NAMESPACE = NIGHTSHIFT_SOURCE_VIEW_PREFIX.slice(0, -1);
// ES wildcards cannot be compared to a view name directly, so a `$` pattern is probed with
// sample view names. Hyphenated space ids and slugs are what real names produce; the plain `x`
// slug is the punctuation-only fallback, and a single letter would miss `$.*.sources.*-*`.
const NIGHTSHIFT_SOURCE_VIEW_EXAMPLES = [
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}default.x`,
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}default.nginx-errors`,
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}default.nginx-errors-2`,
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}team-a.nginx-errors`,
] as const;

const esWildcardMatches = (pattern: string, candidate: string): boolean => {
  const regexSource = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexSource}$`).test(candidate);
};

/**
 * Rejects any pattern that could match a Nightshift view name. ES `simpleMatch`: `*` is
 * multi-segment, so `$.nightshift.*` hits `$.nightshift.sources.<spaceId>.<slug>`. Index
 * wildcards (`*`, `logs-*`) never enter the `$.` namespace; leave those alone.
 */
const isNightshiftSourceViewPattern = (name: string): boolean => {
  const pattern = name.toLowerCase();
  if (!pattern.startsWith('$')) {
    return false;
  }
  return (
    pattern.startsWith(NIGHTSHIFT_SOURCE_VIEW_NAMESPACE) ||
    NIGHTSHIFT_SOURCE_VIEW_EXAMPLES.some((example) => esWildcardMatches(pattern, example))
  );
};

// `::` is the selector separator (`logs-*::data`), not a cluster prefix.
const CLUSTER_PREFIX = /^[^:]+:(?!:)/;
const BACKTICK_QUOTES = /^`(.*)`$/;

/**
 * Index pattern with the cluster prefix removed. `remote:logs-*` is `logs-*`. A quoted source
 * (`"remote:*"`) reaches us as one index literal with no parsed prefix, so strip it from the
 * text. Backticks are identifier quotes, not part of the name.
 */
const indexPatternOf = (source: ESQLSource): string | undefined => {
  const raw =
    source.index?.valueUnquoted ?? (typeof source.name === 'string' ? source.name : undefined);
  if (raw === undefined) {
    return undefined;
  }
  const unticked = raw.replace(BACKTICK_QUOTES, '$1');
  return source.prefix ? unticked : unticked.replace(CLUSTER_PREFIX, '');
};

/**
 * `-logs-*`, `-cluster:*` and `cluster:-logs-*` drop indices. They are not targets, so they
 * do not pick a type and do not count as an unscoped wildcard.
 */
const isExcludedIndex = (source: ESQLSource): boolean => {
  const pattern = indexPatternOf(source);
  const cluster = source.prefix?.valueUnquoted;
  return (
    (pattern !== undefined && pattern.startsWith('-')) ||
    (cluster !== undefined && cluster.startsWith('-'))
  );
};

interface TargetedIndex {
  /** What the query wrote, including a cluster prefix and selector. */
  name: string;
  /** Index pattern used for type checks. */
  pattern: string;
}

const isIndexSource = (node: { type: string; sourceType?: string }): node is ESQLSource =>
  node.type === 'source' && node.sourceType === 'index';

const targetedIndices = (command: ESQLCommand): TargetedIndex[] =>
  Walker.matchAll(command, { type: 'source', sourceType: 'index' }).flatMap((node) => {
    if (!isIndexSource(node) || isExcludedIndex(node)) {
      return [];
    }
    const pattern = indexPatternOf(node);
    if (pattern === undefined || typeof node.name !== 'string') {
      return [];
    }
    return [{ name: node.name, pattern }];
  });

/**
 * Validates that an ES|QL query is a valid Nightshift source: `FROM` or `TS` (time-series),
 * optionally narrowed by `WHERE`. `METADATA` on that source command is kept. Anything that
 * reshapes rows belongs to the engines reading the view.
 * A remote cluster prefix (`cluster:index`, `*:index`) is allowed; type checks use the index.
 * Nightshift source views (including `$` wildcards that would match them) are rejected because
 * a source cannot `FROM` itself, on this cluster or another.
 *
 * Returns `undefined` when valid, or an error message string when invalid.
 * Browser-safe: does not depend on any server-only module.
 */
export const validateSourceQuery = (esql: string): string | undefined => {
  let root;
  try {
    const parsed = Parser.parse(esql);
    if (parsed.errors.length > 0) {
      return `Invalid ES|QL query: ${parsed.errors.map(({ message }) => message).join('; ')}`;
    }
    root = parsed.root;
  } catch (error) {
    return `Invalid ES|QL query: ${error instanceof Error ? error.message : String(error)}`;
  }

  const [firstCommand] = root.commands;
  if (!firstCommand || !SOURCE_COMMANDS.has(firstCommand.name)) {
    return 'A source query must start with FROM or TS';
  }

  const disallowedCommand = Walker.commands(root).find(
    (command) => command !== firstCommand && !ALLOWED_PROCESSING_COMMANDS.has(command.name)
  );
  if (disallowedCommand) {
    return `Command "${disallowedCommand.name.toUpperCase()}" is not allowed in a source query: only WHERE may follow FROM or TS`;
  }

  const nightshiftView = targetedIndices(firstCommand).find(({ pattern }) =>
    isNightshiftSourceViewPattern(pattern)
  );
  if (nightshiftView) {
    return `Nightshift source views cannot be used as a source (found "${nightshiftView.name}")`;
  }

  return undefined;
};

/** A derived type, or the reason the query cannot be one. */
export type SourceTypeAnalysis = { type: SourceType } | { error: string };

const describeType = (type: SourceType, names: readonly string[]): string =>
  `${type} (${names.join(', ')})`;

const joinAnd = (parts: readonly string[]): string => {
  if (parts.length < 2) {
    return parts[0] ?? '';
  }
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(', ')} and ${last}`;
};

const ambiguousIndexMessage = (name: string, types: readonly string[]): string =>
  `Index "${name}" matches more than one kind of data (${types.join(
    ', '
  )}). A source query must target one kind.`;

const unscopedWildcardMessage = (name: string): string =>
  `Index "${name}" is an unscoped wildcard. A source query must target one kind of data.`;

const mixedSourceTypesMessage = (described: readonly string[]): string =>
  `A source query mixes ${joinAnd(described)}. A source query must target one kind of data.`;

/**
 * The type of an already valid source query. A name that matches two kinds, or indices of more
 * than one kind, comes back as `{ error }`. It assumes {@link validateSourceQuery} returned
 * `undefined`, so it is not exported; {@link analyzeSourceQuery} runs both in order.
 */
const classifySourceQuery = ({ esql }: { esql: string }): SourceTypeAnalysis => {
  const { root } = Parser.parse(esql);
  const [firstCommand] = root.commands;
  if (!firstCommand) {
    return { error: 'A source query must start with FROM or TS' };
  }

  const indices = targetedIndices(firstCommand);
  const unscoped = indices.find(({ pattern }) => isUnscopedIndexPattern(pattern));
  if (unscoped) {
    return { error: unscopedWildcardMessage(unscoped.name) };
  }
  const classified = indices.map(({ name, pattern }) => ({
    name,
    matched: matchSourceTypes(pattern),
  }));
  const ambiguous = classified.find(({ matched }) => matched.length > 1);
  if (ambiguous) {
    return { error: ambiguousIndexMessage(ambiguous.name, ambiguous.matched) };
  }

  const isTimeSeries = firstCommand.name === 'ts';
  // `matchSourceTypes` never returns `unknown`, so an unmatched name lands here. FROM leaves it
  // `unknown`; TS only reads time series data, so it is metrics.
  const unmatchedType: SourceType = isTimeSeries ? 'metrics' : 'unknown';
  const typed = classified.map(({ name, matched }) => ({
    name,
    type: matched[0] ?? unmatchedType,
  }));

  const namesOf = (type: SourceType): string[] => {
    const names = typed.filter((entry) => entry.type === type).map((entry) => entry.name);
    // TS is metrics even when every named index classified as something else.
    return isTimeSeries && type === 'metrics' && names.length === 0 ? ['TS'] : names;
  };
  const present = SOURCE_TYPES.filter((type) => namesOf(type).length > 0);
  if (present.length > 1) {
    return {
      error: mixedSourceTypesMessage(present.map((type) => describeType(type, namesOf(type)))),
    };
  }

  return { type: present[0] ?? 'unknown' };
};

/**
 * Structural validation, then the one-type check. `{ error }` is either failure.
 * Browser-safe: does not depend on any server-only module.
 */
export const analyzeSourceQuery = ({ esql }: { esql: string }): SourceTypeAnalysis => {
  const error = validateSourceQuery(esql);
  if (error) {
    return { error };
  }
  return classifySourceQuery({ esql });
};

/**
 * The source command alone (`FROM a, b*` or `TS ...`), used to probe whether any index exists
 * behind an already validated query. Only safe to call after `validateSourceQuery` returned
 * `undefined`.
 */
export const getSourceCommandQuery = (esql: string): string => {
  const { root } = Parser.parse(esql);
  const [firstCommand] = root.commands;
  return BasicPrettyPrinter.command(firstCommand);
};

/**
 * True when FROM/TS names more than one index. `Unknown index` then cannot mean the whole
 * source is empty, because another named index may still have data.
 */
export const hasMultipleSourceIndices = (esql: string): boolean => {
  const { root } = Parser.parse(esql);
  const [firstCommand] = root.commands;
  if (!firstCommand) {
    return false;
  }
  return targetedIndices(firstCommand).length > 1;
};
