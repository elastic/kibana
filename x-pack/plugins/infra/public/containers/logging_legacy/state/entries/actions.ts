/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { LogEntry, LogEntryTime } from '../../../../../common/log_entry';

const actionCreator = actionCreatorFactory('kibana/logging/entries');

/**
 * REPLACE_ENTRIES
 */

export interface ReplaceEntriesPayload {
  count: number;
  clearEagerly: boolean;
}

export interface ReplaceEntriesResult {
  logEntriesBefore: LogEntry[];
  logEntriesAfter: LogEntry[];
}

export const replaceEntries = actionCreator.async<ReplaceEntriesPayload, ReplaceEntriesResult>(
  'REPLACE_ENTRIES'
);

/**
 * EXTEND_ENTRIES
 */

export interface ExtendEntriesPayload {
  count: number;
  target: LogEntryTime;
}

export interface ExtendEntriesResult {
  logEntries: LogEntry[];
}

export const extendEntriesStart = actionCreator.async<ExtendEntriesPayload, ExtendEntriesResult>(
  'EXTEND_ENTRIES_START'
);

export const extendEntriesEnd = actionCreator.async<ExtendEntriesPayload, ExtendEntriesResult>(
  'EXTEND_ENTRIES_END'
);

/**
 * CONSOLIDATE_ENTRIES
 */

export interface ConsolidateEntriesPayload {
  after: number;
  before: number;
  target: LogEntryTime;
}

export const consolidateEntries = actionCreator<ConsolidateEntriesPayload>('CONSOLIDATE_ENTRIES');

/**
 * REPORT_VISIBLE_ENTRIES
 */

export interface ReportVisibleEntriesPayload {
  pagesAfterEnd: number;
  pagesBeforeStart: number;
  endKey: LogEntryTime | null;
  middleKey: LogEntryTime | null;
  startKey: LogEntryTime | null;
}

export const reportVisibleEntries = actionCreator<ReportVisibleEntriesPayload>(
  'REPORT_VISIBLE_ENTRIES'
);

/**
 * LIVE_STREAMING
 */

export const startLiveStreaming = actionCreator('START_LIVE_STREAMING');

export const stopLiveStreaming = actionCreator('STOP_LIVE_STREAMING');
