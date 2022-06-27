/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateSnoozeEndDate = (date: string) => {
  const parsedValue = Date.parse(date);
  if (isNaN(parsedValue)) return `Invalid date: ${date}`;
  if (parsedValue <= Date.now()) return `Invalid snooze date as it is in the past: ${date}`;
  return;
};

export const validateSnoozeStartDate = (date: string) => {
  const parsedValue = Date.parse(date);
  if (isNaN(parsedValue)) return `Invalid date: ${date}`;
  return;
};
