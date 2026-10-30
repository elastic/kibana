/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorFromLogsRow } from '../../../app/error_group_overview/errors_from_logs/use_service_errors_from_logs';

export interface LogErrorGroup {
  /** Exception type + message; the client-side grouping key. */
  key: string;
  type: string;
  message: string;
  count: number;
  /** Most recent occurrence, in microseconds. */
  lastSeenUs: number;
  /** The most recent row, used as the sample opened in the doc viewer. */
  sample: ErrorFromLogsRow;
}

/**
 * Stopgap client-side grouping of error logs by (type, message). Log errors have
 * no grouping key and the endpoint returns a flat list capped at 500 rows, so the
 * counts only cover those rows. Server-side grouping is tracked in #291985.
 */
export function groupLogErrors(rows: ErrorFromLogsRow[]): LogErrorGroup[] {
  const groups = new Map<string, LogErrorGroup>();

  for (const row of rows) {
    const key = `${row.type}\u0000${row.message}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        type: row.type,
        message: row.message,
        count: 1,
        lastSeenUs: row.timestampUs,
        sample: row,
      });
    } else {
      existing.count += 1;
      if (row.timestampUs > existing.lastSeenUs) {
        existing.lastSeenUs = row.timestampUs;
        existing.sample = row;
      }
    }
  }

  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastSeenUs - a.lastSeenUs);
}
