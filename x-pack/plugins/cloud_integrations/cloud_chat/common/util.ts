/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if today's date is within the an end date + buffer, false otherwise.
 *
 * @param endDate The end date of the trial.
 * @param buffer The number of days to add to the end date.
 * @returns true if today's date is within the an end date + buffer, false otherwise.
 */
export const isTodayInDateWindow = (endDate: Date, buffer: number) => {
  const endDateWithBuffer = new Date(endDate);
  endDateWithBuffer.setDate(endDateWithBuffer.getDate() + buffer);
  return endDateWithBuffer > new Date();
};
