/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';

export const getReplacementsRecords = (
  replacements: Array<{ value: string; uuid: string }>
): Replacements =>
  replacements.reduce<Record<string, string>>(
    (acc, { value, uuid }) => ({ ...acc, [uuid]: value }),
    {}
  );

export const getReplacementsArray = (
  replacements: Replacements
): Array<{ value: string; uuid: string }> =>
  Object.entries(replacements).map(([uuid, value]) => ({ uuid, value }));
