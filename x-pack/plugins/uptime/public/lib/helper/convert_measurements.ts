/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const NUM_MICROSECONDS_IN_MILLISECOND = 1000;

/**
 * This simply converts microseconds to milliseconds. People tend to prefer ms to us
 * when visualizaing request duration times.
 */
export const convertMicrosecondsToMilliseconds = (microseconds: number | null | undefined) =>
  microseconds ? Math.round(microseconds / NUM_MICROSECONDS_IN_MILLISECOND) : microseconds;
