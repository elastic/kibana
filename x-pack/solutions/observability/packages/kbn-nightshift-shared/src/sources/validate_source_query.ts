/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser, Walker } from '@elastic/esql';
import type { ESQLCommand, ESQLSource } from '@elastic/esql/types';
import { isUnscopedIndexPattern, matchSourceTypes, type SourceType } from './source_type';
import { NIGHTSHIFT_SOURCE_VIEW_PREFIX } from './view_name';

const SOURCE_COMMANDS = new Set(['from', 'ts']);
const ALLOWED_PROCESSING_COMMANDS = new Set(['where']);
// Drop the trailing `.` so `$.nightshift.sources` and `$.nightshift.sources*` match too.
const NIGHTSHIFT_SOURCE_VIEW_NAMESPACE = NIGHTSHIFT_SOURCE_VIEW_PREFIX.slice(0, -1);
// `x` is the punctuation-only fallback. Hyphenated space ids and slugs are what real
// names produce; a single letter misses patterns such as `$.*.sources.*-*`.
const NIGHTSHIFT_SOURCE_VIEW_EXAMPLES = [
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}default.x`,
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}default.nginx-errors`,
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}default.nginx-errors-2`,
  `${NIGHTSHIFT_SOURCE_VIEW_PREFIX}team-a.nginx-errors`,
] as const;

/**
 * ES `simpleMatch`: `*` is multi-segment, so `$.nightshift.*` hits
 * `$.nightshift.sources.<spaceId>.<slug>`. Index wildcards (`*`, `logs-*`) never enter
 * the `$.` namespace; leave those alone.
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

const esWildcardMatches = (pattern: string, candidate: string): boolean => {
  const regexSource = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexSource}$`).test(candidate);
};

/** Index pattern with the cluster prefix removed. `remote:logs-*` is `logs-*`. */
const indexPatternOf = (source: ESQLSource): string | undefined =>
  source.index?.valueUnquoted ?? (typeof source.name === 'string' ? source.name : undefined);

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
 * optionally narrowed by `WHERE`. Anything that reshapes rows belongs to the engines reading
 * the view. `METADATA` is rejected because ES|QL returns nulls for it through a view.
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
      return `Invalid ES|QL query: ${parsed.errors.map((e) => e.message).join('; ')}`;
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

  if (Walker.matchAll(root, { type: 'option', name: 'metadata' }).length > 0) {
    return 'METADATA is not allowed in a source query';
  }

  const nightshiftView = Walker.find(
    root,
    (node) =>
      node.type === 'source' &&
      node.sourceType === 'index' &&
      !isExcludedIndex(node) &&
      typeof node.name === 'string' &&
      isNightshiftSourceViewPattern(indexPatternOf(node) ?? node.name)
  );
  if (nightshiftView) {
    return `Nightshift source views cannot be used as a source (found "${nightshiftView.name}")`;
  }

  return undefined;
};

/** A derived type, or the reason the query cannot be one. */
export type SourceTypeAnalysis = { type: SourceType } | { error: string };

const SOURCE_TYPE_ORDER = [
  'logs',
  'traces',
  'metrics',
  'unknown',
] as const satisfies readonly SourceType[];

const emptyNamesByType = (): Record<SourceType, string[]> => ({
  logs: [],
  metrics: [],
  traces: [],
  unknown: [],
});

const describeType = (
  type: SourceType,
  names: readonly string[],
  isTimeSeries: boolean
): string => {
  if (names.length > 0) {
    return `${type} (${names.join(', ')})`;
  }
  // The TS command contributes metrics even when no index name was classified as metrics.
  if (isTimeSeries && type === 'metrics') {
    return 'metrics (TS)';
  }
  return type;
};

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

const mixedSourceTypesMessage = (
  namesByType: Record<SourceType, string[]>,
  present: readonly SourceType[],
  isTimeSeries: boolean
): string => {
  const described = present.map((type) => describeType(type, namesByType[type], isTimeSeries));
  return `A source query mixes ${joinAnd(described)}. A source query must target one kind of data.`;
};

/**
 * The type of an already valid source query. A name that matches two kinds, or indices of more
 * than one kind, comes back as `{ error }`. Only safe to call after `validateSourceQuery`
 * returned `undefined`; {@link analyzeSourceQuery} does both.
 */
export const getSourceType = ({ esql }: { esql: string }): SourceTypeAnalysis => {
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
  const namesByType = emptyNamesByType();
  for (const { name, matched } of classified) {
    // `matchSourceTypes` never returns `unknown`. An unmatched name on TS is metrics, on FROM unknown.
    namesByType[matched[0] ?? (isTimeSeries ? 'metrics' : 'unknown')].push(name);
  }

  // A TS command is metrics even when every named index classified as something else.
  const present = SOURCE_TYPE_ORDER.filter(
    (type) => namesByType[type].length > 0 || (isTimeSeries && type === 'metrics')
  );
  if (present.length > 1) {
    return { error: mixedSourceTypesMessage(namesByType, present, isTimeSeries) };
  }

  return { type: present[0] ?? 'unknown' };
};

/**
 * Classification for a saved-object backfill. `unknown` is a mix, a parse failure, or a name
 * that is not logs, metrics or traces.
 */
export const sourceTypeFromEsql = (esql: string): SourceType => {
  try {
    const analysis = getSourceType({ esql });
    return 'type' in analysis ? analysis.type : 'unknown';
  } catch {
    return 'unknown';
  }
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
  return getSourceType({ esql });
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
