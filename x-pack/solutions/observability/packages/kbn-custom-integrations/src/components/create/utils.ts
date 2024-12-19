/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const replaceSpecialChars = (value: string) => {
  // Replace special characters with _
  const replacedSpecialCharacters = value.replaceAll(/[^a-zA-Z0-9_]/g, '_');
  // Allow only one _ in a row
  const noRepetitions = replacedSpecialCharacters.replaceAll(/[\_]{2,}/g, '_');
  return noRepetitions;
};
