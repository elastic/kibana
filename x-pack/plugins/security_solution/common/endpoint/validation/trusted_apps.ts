/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConditionEntry, ConditionEntryField } from '../types';

const HASH_LENGTHS: readonly number[] = [
  32, // MD5
  40, // SHA1
  64, // SHA256
];
const INVALID_CHARACTERS_PATTERN = /[^0-9a-f]/i;

export const isValidHash = (value: string) =>
  HASH_LENGTHS.includes(value.length) && !INVALID_CHARACTERS_PATTERN.test(value);

export const getDuplicateFields = (entries: ConditionEntry[]) => {
  const groupedFields = new Map<ConditionEntryField, ConditionEntry[]>();

  entries.forEach((entry) => {
    groupedFields.set(entry.field, [...(groupedFields.get(entry.field) || []), entry]);
  });

  return [...groupedFields.entries()]
    .filter((entry) => entry[1].length > 1)
    .map((entry) => entry[0]);
};
