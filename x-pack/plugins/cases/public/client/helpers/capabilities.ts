/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CasesPermissions {
  all: boolean;
  read: boolean;
}

export const getUICapabilities = (
  featureCapabilities: Partial<Record<string, boolean | Record<string, boolean>>>
): CasesPermissions => {
  const read = !!featureCapabilities?.read_cases;
  const all = !!featureCapabilities?.crud_cases;

  return {
    all,
    read,
  };
};
