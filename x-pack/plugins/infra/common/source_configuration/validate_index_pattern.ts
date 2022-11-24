/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateIndexPattern = (indexPattern?: string) => {
  if (indexPattern === undefined) return true;

  return (
    !isEmptyString(indexPattern) &&
    !containsEmptyEntries(indexPattern) &&
    !containsSpaces(indexPattern)
  );
};

export const isEmptyString = (value: string) => {
  return value === '';
};

export const containsEmptyEntries = (value: string) => {
  return value.split(',').some(isEmptyString);
};

export const containsSpaces = (value: string) => {
  return value.includes(' ');
};
