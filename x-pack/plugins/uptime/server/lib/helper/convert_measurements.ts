/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This simply converts microseconds to milliseconds, which are 1000 less precise
 * than microseconds.
 */
export const convertMicrosecondsToMilliseconds = (microseconds: number | null) =>
  microseconds ? Math.round(microseconds / 1000) : null;
