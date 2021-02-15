/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The default d3-time-format is a bit strange for small ranges, so we will specify our own
export function getTimeLabelFormat(start: number, end: number): string | undefined {
  const diff = Math.abs(end - start);

  // 15 seconds
  if (diff < 15 * 1000) {
    return ':%S.%L';
  }

  // 16 minutes
  if (diff < 16 * 60 * 1000) {
    return '%I:%M:%S';
  }

  // Use D3's default
  return;
}
