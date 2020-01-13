/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraLogEntryHighlightFields } from '../../graphql/types';

export type LogEntryHighlight = InfraLogEntryHighlightFields.Fragment;

export type LogEntryHighlightColumn = InfraLogEntryHighlightFields.Columns;
export type LogEntryHighlightMessageColumn = InfraLogEntryHighlightFields.InfraLogEntryMessageColumnInlineFragment;
export type LogEntryHighlightFieldColumn = InfraLogEntryHighlightFields.InfraLogEntryFieldColumnInlineFragment;

export type LogEntryHighlightMessageSegment = InfraLogEntryHighlightFields.Message | {};
export type LogEntryHighlightFieldMessageSegment = InfraLogEntryHighlightFields.InfraLogMessageFieldSegmentInlineFragment;

export interface LogEntryHighlightsMap {
  [entryId: string]: LogEntryHighlight[];
}

export const isHighlightMessageColumn = (
  column: LogEntryHighlightColumn
): column is LogEntryHighlightMessageColumn => column != null && 'message' in column;

export const isHighlightFieldColumn = (
  column: LogEntryHighlightColumn
): column is LogEntryHighlightFieldColumn => column != null && 'field' in column;

export const isHighlightFieldSegment = (
  segment: LogEntryHighlightMessageSegment
): segment is LogEntryHighlightFieldMessageSegment =>
  segment && 'field' in segment && 'highlights' in segment;
