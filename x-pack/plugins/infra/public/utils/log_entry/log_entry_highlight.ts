/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraLogEntryHighlightFields } from '../../graphql/types';
import {
  LogEntry,
  LogColumn,
  LogMessageColumn,
  LogFieldColumn,
  LogMessagePart,
  LogMessageFieldPart,
} from '../../../common/http_api';

export type LogEntryHighlightColumn = InfraLogEntryHighlightFields.Columns;
export type LogEntryHighlightMessageColumn = InfraLogEntryHighlightFields.InfraLogEntryMessageColumnInlineFragment;
export type LogEntryHighlightFieldColumn = InfraLogEntryHighlightFields.InfraLogEntryFieldColumnInlineFragment;

export type LogEntryHighlightMessageSegment = InfraLogEntryHighlightFields.Message | {};
export type LogEntryHighlightFieldMessageSegment = InfraLogEntryHighlightFields.InfraLogMessageFieldSegmentInlineFragment;

export interface LogEntryHighlightsMap {
  [entryId: string]: LogEntry[];
}

export const isHighlightMessageColumn = (column: LogColumn): column is LogMessageColumn =>
  column != null && 'message' in column;

export const isHighlightFieldColumn = (column: LogColumn): column is LogFieldColumn =>
  column != null && 'field' in column;

export const isHighlightFieldSegment = (segment: LogMessagePart): segment is LogMessageFieldPart =>
  segment && 'field' in segment && 'highlights' in segment;
