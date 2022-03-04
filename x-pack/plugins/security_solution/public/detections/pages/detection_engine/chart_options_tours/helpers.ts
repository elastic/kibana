/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STEPS_TOTAL = 2;

export const isStep1Open = ({
  delayElapsed,
  tourStep1Completed,
}: {
  delayElapsed: boolean;
  tourStep1Completed: boolean;
}): boolean => delayElapsed && !tourStep1Completed;

export const isStep2Open = ({
  tourStep1Completed,
  tourStep2Completed,
}: {
  tourStep1Completed: boolean;
  tourStep2Completed: boolean;
}): boolean => tourStep1Completed && !tourStep2Completed;
