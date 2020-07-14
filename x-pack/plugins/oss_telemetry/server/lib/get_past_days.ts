/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const getPastDays = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diff = Math.abs(date.getTime() - today.getTime());
  return Math.trunc(diff / (1000 * 60 * 60 * 24));
};
