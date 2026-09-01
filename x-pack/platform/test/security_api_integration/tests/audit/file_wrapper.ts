/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { isMatch } from 'lodash';

import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { DeepPartial } from '@kbn/utility-types';

const DEFAULT_WAIT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 250;
/** Max candidates to display per unsatisfied query in the near-miss branch. */
const NEAR_MISS_MAX = 3;
/** Max characters to show for a single log entry in the diagnostic output. */
const ENTRY_DISPLAY_MAX = 200;

/**
 * ECS subset of an audit log entry as emitted by the Kibana security plugin.
 * All nested containers are declared required so callers can access nested fields
 * without optional-chain operators. Fields absent in a particular event (e.g.
 * `user` on a failed login) are `undefined` at runtime; TypeScript trusts the
 * cast from `JSON.parse` and the `waitForAuditEvents` postcondition ensures that
 * any entry returned matched at least one query.
 */
export interface AuditLogEntry {
  readonly message: string;
  readonly event: {
    readonly action: string;
    readonly outcome?: string;
    readonly category?: string | readonly string[];
    readonly type?: string | readonly string[];
  };
  readonly trace: {
    readonly id: string;
  };
  readonly user: {
    readonly name: string;
  };
  readonly client: {
    readonly ip: string;
  };
  readonly url: {
    readonly path: string;
    readonly query?: string;
  };
  readonly http: {
    readonly request: {
      readonly method: string;
      readonly headers: Record<string, string>;
    };
  };
  readonly kibana: {
    readonly space_id?: string;
    readonly session_id?: string;
    readonly authentication_provider?: string;
    readonly saved_object?: {
      readonly type: string;
      readonly id?: string;
    };
  };
}

/** Deep-partial record spec for `waitForAuditEvents`. Each key you provide must
 * match exactly; omitted keys are ignored. Uses lodash `isMatch` semantics. */
export type AuditEventQuery = DeepPartial<AuditLogEntry>;

export interface WaitForAuditEventsOptions {
  /** How long to poll before failing with a diagnostic. Defaults to 20 000 ms. */
  readonly timeout?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers (pure functions — no class state, easier to unit-test)
// ---------------------------------------------------------------------------

interface UnparseableLine {
  lineNumber: number;
  content: string;
  /** True when the line is the last non-empty line in the file — may be torn mid-flush. */
  isTrailing: boolean;
}

interface ParsedLog {
  entries: AuditLogEntry[];
  unparseableLines: UnparseableLine[];
}

const parseLine = (line: string): AuditLogEntry | null => {
  try {
    return JSON.parse(line) as AuditLogEntry;
  } catch {
    return null;
  }
};

/**
 * Splits file content into successfully-parsed entries and unparseable lines.
 * Never throws — callers decide what to do with unparseable lines.
 */
const parseLog = (content: string): ParsedLog => {
  const lines = content.split('\n');
  const entries: AuditLogEntry[] = [];
  const unparseableLines: UnparseableLine[] = [];

  // Identify the last non-empty line so we can distinguish a torn trailing
  // record (flush still in progress) from genuine mid-file corruption.
  let lastNonEmptyIndex = lines.length - 1;
  while (lastNonEmptyIndex >= 0 && lines[lastNonEmptyIndex].trim() === '') {
    lastNonEmptyIndex--;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const entry = parseLine(line);
    if (entry !== null) {
      entries.push(entry);
    } else {
      unparseableLines.push({
        lineNumber: i + 1,
        content: line,
        isTrailing: i === lastNonEmptyIndex,
      });
    }
  }

  return { entries, unparseableLines };
};

const truncate = (str: string, maxLen: number): string =>
  str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;

const summarizeActions = (entries: readonly AuditLogEntry[]): string => {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const { action } = e.event;
    counts.set(action, (counts.get(action) ?? 0) + 1);
  }
  return counts.size === 0
    ? 'none'
    : [...counts.entries()].map(([a, n]) => `${a} (x${n})`).join(', ');
};

/**
 * If any logged entries share `event.action` with `query` but failed the full
 * match, describe them so engineers can see exactly which field differed.
 */
const describeNearMisses = (query: AuditEventQuery, entries: readonly AuditLogEntry[]): string => {
  const action = (query.event as { action?: string } | undefined)?.action;
  if (!action) return '';
  const sameAction = entries.filter((e) => e.event.action === action);
  if (sameAction.length === 0) return '';
  const shown = sameAction.slice(0, NEAR_MISS_MAX);
  const more =
    sameAction.length > NEAR_MISS_MAX ? ` (+${sameAction.length - NEAR_MISS_MAX} more)` : '';
  const formatted = shown
    .map((e) => `          ${truncate(JSON.stringify(e), ENTRY_DISPLAY_MAX)}`)
    .join('\n');
  return (
    `\n        ${sameAction.length} logged entry/entries share event.action '${action}' but did not match:\n` +
    `${formatted}${more}`
  );
};

const buildDiagnostic = (
  filePath: string,
  queries: readonly AuditEventQuery[],
  entries: readonly AuditLogEntry[],
  unparseableLines: readonly UnparseableLine[],
  timeout: number
): string => {
  const unmatched = queries.filter((q) => !entries.some((e) => isMatch(e, q)));
  const satisfied = queries.filter((q) => entries.some((e) => isMatch(e, q)));

  const parts: string[] = [
    `Audit log '${filePath}' did not contain all ${queries.length} expected event(s) within ${timeout}ms.`,
  ];

  if (unmatched.length > 0) {
    parts.push(`  unsatisfied queries (${unmatched.length} of ${queries.length}):`);
    for (const q of unmatched) {
      parts.push(`      ${JSON.stringify(q)}${describeNearMisses(q, entries)}`);
    }
  }

  if (satisfied.length > 0) {
    parts.push(`  satisfied queries (${satisfied.length} of ${queries.length}):`);
    for (const q of satisfied) {
      parts.push(`      ${JSON.stringify(q)}`);
    }
  }

  parts.push(`  ${entries.length} entry/entries logged: ${summarizeActions(entries)}`);

  const trailingLines = unparseableLines.filter((l) => l.isTrailing);
  const corruptLines = unparseableLines.filter((l) => !l.isTrailing);

  if (trailingLines.length > 0) {
    parts.push(
      `  ${trailingLines.length} trailing (in-progress) record(s) excluded from matching:`
    );
    for (const l of trailingLines) {
      parts.push(`      line ${l.lineNumber}: ${truncate(l.content, ENTRY_DISPLAY_MAX)}`);
    }
  }

  if (corruptLines.length > 0) {
    parts.push(
      `  ${corruptLines.length} permanently unparseable line(s) (possible log corruption):`
    );
    for (const l of corruptLines) {
      parts.push(`      line ${l.lineNumber}: ${truncate(l.content, ENTRY_DISPLAY_MAX)}`);
    }
  }

  return parts.join('\n');
};

// ---------------------------------------------------------------------------
// FileWrapper
// ---------------------------------------------------------------------------

export class FileWrapper {
  constructor(private readonly path: string, private readonly retry: RetryService) {}

  async reset() {
    // "touch" each file to ensure it exists and is empty before each test
    await Fs.promises.writeFile(this.path, '');
  }

  /**
   * Polls the audit log until every query in `queries` is matched by at least
   * one log entry, then returns the full log in write order.
   *
   * Matching uses `lodash.isMatch` semantics: each query is treated as a
   * deep-partial spec where only the provided fields must match exactly and
   * omitted fields are ignored.
   *
   * The return value is the **full** log — positional indexing and length
   * assertions on the returned array are safe because the poll only exits once
   * all requested events are confirmed on disk.
   *
   * NOTE: `saved_object_find` audit events are emitted **one per returned
   * object** (see `getFindRedactTypeMap` in saved_objects_security_extension.ts).
   * A zero-result find emits nothing. Querying for a `saved_object_find` event
   * is currently safe because `DEFAULT_REFRESH_SETTING = 'wait_for'` guarantees
   * created objects are visible before find executes. If that default changes,
   * this method will time out and emit a diagnostic naming the unsatisfied query
   * rather than silently returning a partial log.
   */
  public async waitForAuditEvents(
    queries: readonly AuditEventQuery[],
    { timeout = DEFAULT_WAIT_TIMEOUT_MS }: WaitForAuditEventsOptions = {}
  ): Promise<AuditLogEntry[]> {
    if (queries.length === 0) {
      throw new Error('waitForAuditEvents: queries array must not be empty');
    }

    return this.retry.tryForTime(
      timeout,
      async () => {
        let content: string;
        try {
          content = await Fs.promises.readFile(this.path, { encoding: 'utf8' });
        } catch {
          throw new Error(
            `Audit log '${this.path}' does not exist or could not be read. ` +
              `Check that the appender.fileName configuration matches this path.`
          );
        }

        const { entries, unparseableLines } = parseLog(content);
        const unmatched = queries.filter((q) => !entries.some((e) => isMatch(e, q)));

        if (unparseableLines.length > 0 || unmatched.length > 0) {
          throw new Error(buildDiagnostic(this.path, queries, entries, unparseableLines, timeout));
        }

        return entries;
      },
      undefined,
      POLL_INTERVAL_MS
    );
  }
}
