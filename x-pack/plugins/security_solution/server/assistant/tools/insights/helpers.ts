/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getReplacementsRecords = (
  replacements: Array<{ value: string; uuid: string }>
): Record<string, string> =>
  replacements.reduce<Record<string, string>>(
    (acc, { value, uuid }) => ({ ...acc, [uuid]: value }),
    {}
  );

export const getReplacementsArray = (
  replacements: Record<string, string>
): Array<{ value: string; uuid: string }> =>
  Object.entries(replacements).map(([uuid, value]) => ({ uuid, value }));
