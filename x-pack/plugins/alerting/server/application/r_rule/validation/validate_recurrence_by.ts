/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateRecurrenceBy = <T>(name: string, array: T[]) => {
  if (array.length === 0) {
    return `rRule ${name} cannot be empty`;
  }
};

export const createValidateRecurrenceBy = <T>(name: string) => {
  return (array: T[]) => validateRecurrenceBy(name, array);
};
