/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { TimeKey } from '../../../../common/time';
import { loadMoreEntriesActionCreators } from './load_more_operation';
import { loadEntriesActionCreators } from './load_operation';

const actionCreator = actionCreatorFactory('x-pack/infra/remote/log_entries');

export const loadEntries = loadEntriesActionCreators.resolve;
export const loadMoreEntries = loadMoreEntriesActionCreators.resolve;

/**
 * REPORT_VISIBLE_ENTRIES
 */

export interface ReportVisibleEntriesPayload {
  pagesAfterEnd: number;
  pagesBeforeStart: number;
  endKey: TimeKey | null;
  middleKey: TimeKey | null;
  startKey: TimeKey | null;
}

export const reportVisibleEntries = actionCreator<ReportVisibleEntriesPayload>(
  'REPORT_VISIBLE_ENTRIES'
);

/**
 * LIVE_STREAMING
 */

export const startLiveStreaming = actionCreator('START_LIVE_STREAMING');

export const stopLiveStreaming = actionCreator('STOP_LIVE_STREAMING');
