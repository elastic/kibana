/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bisector } from 'd3-array';

import { getLogEntryKey, LogEntry } from '../../../../common/log_entry';
import { SearchResult } from '../../../../common/log_search_result';
import { compareToTimeKey, TimeKey } from '../../../../common/time';

export type StreamItem = LogEntryStreamItem;

export interface LogEntryStreamItem {
  kind: 'logEntry';
  logEntry: LogEntry;
  searchResult: SearchResult | undefined;
}

export function getStreamItemTimeKey(item: StreamItem) {
  switch (item.kind) {
    case 'logEntry':
      return getLogEntryKey(item.logEntry);
  }
}

export function getStreamItemId(item: StreamItem) {
  const { time, tiebreaker, gid } = getStreamItemTimeKey(item);

  return `${time}:${tiebreaker}:${gid}`;
}

export function parseStreamItemId(id: string) {
  const idFragments = id.split(':');

  return {
    gid: idFragments.slice(2).join(':'),
    tiebreaker: parseInt(idFragments[1], 10),
    time: parseInt(idFragments[0], 10),
  };
}

const streamItemTimeBisector = bisector(compareToTimeKey(getStreamItemTimeKey));

export const getStreamItemBeforeTimeKey = (streamItems: StreamItem[], key: TimeKey) =>
  streamItems[Math.min(streamItemTimeBisector.left(streamItems, key), streamItems.length - 1)];
