/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a history start string to a history size string by removing the 'now-' prefix.
 *
 * @param historyStart - History start string to convert. For example, "now-30d".
 * @returns Converted size string. For example, "30d".
 */
export const convertHistoryStartToSize = (historyStart: string) => {
  if (historyStart.startsWith('now-')) {
    return historyStart.substring(4);
  } else {
    return historyStart;
  }
};

/**
 * Converts a history size string to a history start string by adding the 'now-' prefix.
 *
 * @param historySize - History size string to convert. For example, "30d".
 * @returns Converted start string. For example, "now-30d".
 */
export const convertHistorySizeToStart = (historySize: string) => `now-${historySize}`;
