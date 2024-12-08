/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateByWeekDay = (values: string[]) => {
  if (values.length === 0) {
    return `rRule byweekday cannot be empty`;
  }

  const validWeekDays = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

  if (!values.every((value) => validWeekDays.has(value))) {
    return `rRule byweekday should be one of ${Array.from(validWeekDays.values()).join(', ')}`;
  }
};
