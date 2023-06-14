/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogColumn,
  LogEntry,
  LogFieldColumn,
  LogMessageColumn,
  LogMessageFieldPart,
  LogMessagePart,
} from '@kbn/logs-shared-plugin/common';

export interface LogEntryHighlightsMap {
  [entryId: string]: LogEntry[];
}

export const isHighlightMessageColumn = (column: LogColumn): column is LogMessageColumn =>
  column != null && 'message' in column;

export const isHighlightFieldColumn = (column: LogColumn): column is LogFieldColumn =>
  column != null && 'field' in column;

export const isHighlightFieldSegment = (segment: LogMessagePart): segment is LogMessageFieldPart =>
  segment && 'field' in segment && 'highlights' in segment;
