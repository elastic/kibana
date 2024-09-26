/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getTimestamp(timestamp?: string, timestampUs?: number): number {
  if (!timestampUs && timestamp) {
    const date = new Date(timestamp);
    const milliseconds = date.getTime() * 1000;

    const microsecondsMatch = timestamp.match(/\.(\d{3})(\d{3})?Z$/);
    const microseconds = microsecondsMatch ? parseInt(microsecondsMatch[2] || '000', 10) : 0;

    return milliseconds + microseconds;
  }

  return timestampUs || 0;
}
