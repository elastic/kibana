/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LogEntry,
  LogColumn,
  LogMessageColumn,
  LogFieldColumn,
  LogMessagePart,
  LogMessageFieldPart,
} from '../../../common/http_api';

export interface InfraLogMessageFieldSegmentInlineFragment {
  field: string;
  value: string;
}

export interface InfraLogMessageConstantSegmentInlineFragment {
  constant: string;
}

type Message =
  | InfraLogMessageFieldSegmentInlineFragment
  | InfraLogMessageConstantSegmentInlineFragment;

export interface InfraLogEntryTimestampColumnInlineFragment {
  columnId: string;
  timestamp: number;
}

export interface InfraLogEntryMessageColumnInlineFragment {
  columnId: string;
  message: Message[];
}

export interface InfraLogEntryFieldColumnInlineFragment {
  columnId: string;
  field: string;
  value: string;
}

export type LogEntryHighlightColumn =
  | InfraLogEntryTimestampColumnInlineFragment
  | InfraLogEntryMessageColumnInlineFragment
  | InfraLogEntryFieldColumnInlineFragment;

export interface LogEntryHighlightMessageColumn {
  columnId: string;
  message: Message[];
}

export interface LogEntryHighlightFieldColumn {
  columnId: string;
  field: string;
  value: string;
}

export type LogEntryHighlightMessageSegment = Message | {};
export type LogEntryHighlightFieldMessageSegment = InfraLogMessageFieldSegmentInlineFragment;

export interface LogEntryHighlightsMap {
  [entryId: string]: LogEntry[];
}

export const isHighlightMessageColumn = (column: LogColumn): column is LogMessageColumn =>
  column != null && 'message' in column;

export const isHighlightFieldColumn = (column: LogColumn): column is LogFieldColumn =>
  column != null && 'field' in column;

export const isHighlightFieldSegment = (segment: LogMessagePart): segment is LogMessageFieldPart =>
  segment && 'field' in segment && 'highlights' in segment;
