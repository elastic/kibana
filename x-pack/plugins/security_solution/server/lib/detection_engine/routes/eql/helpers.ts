/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Validation {
  isValid: boolean;
  errors: string[];
}

export interface ValidateEqlParams {
  client: unknown;
  index: string[];
  query: string;
}

export const validateEql = async ({
  client,
  index,
  query,
}: ValidateEqlParams): Promise<Validation> => {
  return { isValid: true, errors: [] };
};
