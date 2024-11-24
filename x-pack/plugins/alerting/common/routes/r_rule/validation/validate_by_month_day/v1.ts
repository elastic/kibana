/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateByMonthDay = (values: number[]) => {
  if (values.length === 0) {
    return `rRule bymonthday cannot be empty`;
  }

  if (!values.every((value) => value >= 1 && value <= 31)) {
    return `rRule bymonthday should be between 1 and 31 inclusive`;
  }
};
