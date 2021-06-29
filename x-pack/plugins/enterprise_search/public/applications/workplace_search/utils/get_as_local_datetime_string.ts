/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAsLocalDateTimeString = (str: string) => {
  const dateValue = Date.parse(str);
  return dateValue ? new Date(dateValue).toLocaleString() : null;
};
