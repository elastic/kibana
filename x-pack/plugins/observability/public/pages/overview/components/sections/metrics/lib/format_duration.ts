/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export const formatDuration = (seconds: number) => {
  if (seconds < MINUTE) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds < HOUR) {
    return `${Math.floor(seconds / MINUTE)}m ${Math.floor(seconds % MINUTE)}s`;
  }
  if (seconds < DAY) {
    return `${Math.floor(seconds / HOUR)}h ${Math.floor((seconds % HOUR) / MINUTE)}m`;
  }
  return `${Math.floor(seconds / DAY)}d ${Math.floor((seconds % DAY) / HOUR)}h`;
};
