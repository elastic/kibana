/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeKey } from '@kbn/io-ts-utils';
import { bisector } from 'd3-array';
import { LogEntry } from '../../../../common/log_entry';
import { compareToTimeKey } from '../../../../common/time';

export type StreamItem = LogEntryStreamItem;

export interface LogEntryStreamItem {
  kind: 'logEntry';
  logEntry: LogEntry;
  highlights: LogEntry[];
}

export function getStreamItemTimeKey(item: StreamItem) {
  switch (item.kind) {
    case 'logEntry':
      return item.logEntry.cursor;
  }
}

export function getStreamItemId(item: StreamItem) {
  switch (item.kind) {
    case 'logEntry':
      return `${item.logEntry.cursor.time}/${item.logEntry.cursor.tiebreaker}/${item.logEntry.id}`;
  }
}

export function parseStreamItemId(id: string) {
  const idFragments = id.split('/');

  return {
    gid: idFragments.slice(2).join(':'),
    tiebreaker: parseInt(idFragments[1], 10),
    time: idFragments[0],
  };
}

const streamItemTimeBisector = bisector(compareToTimeKey(getStreamItemTimeKey));

export const getStreamItemBeforeTimeKey = (streamItems: StreamItem[], key: TimeKey) =>
  streamItems[Math.min(streamItemTimeBisector.left(streamItems, key), streamItems.length - 1)];
