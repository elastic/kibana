/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDateString = (offSetDays?: number) => {
  const date = new Date(Date.now());
  if (offSetDays) date.setDate(date.getDate() + offSetDays);
  return date.toISOString();
};

export const getStatusColor = (status: number) => {
  let color = '';
  if (status >= 100 && status < 300) color = 'success';
  if (status >= 300 && status < 400) color = 'primary';
  if (status >= 400 && status < 500) color = 'warning';
  if (status >= 500) color = 'danger';
  return color;
};

export const attemptToFormatJson = (possibleJson: string) => {
  try {
    // it is JSON, we can format it with newlines/indentation
    return JSON.stringify(JSON.parse(possibleJson), null, 2);
  } catch {
    // if it's not JSON, we return the original content
    return possibleJson;
  }
};
