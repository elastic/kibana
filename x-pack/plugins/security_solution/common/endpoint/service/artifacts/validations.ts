/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConditionEntryField } from '@kbn/securitysolution-utils';
import { TrustedAppConditionEntry } from '../../types';

const HASH_LENGTHS: readonly number[] = [
  32, // MD5
  40, // SHA1
  64, // SHA256
];
const INVALID_CHARACTERS_PATTERN = /[^0-9a-f]/i;

export const isValidHash = (value: string) =>
  HASH_LENGTHS.includes(value.length) && !INVALID_CHARACTERS_PATTERN.test(value);

export const getDuplicateFields = (entries: TrustedAppConditionEntry[]) => {
  const groupedFields = new Map<ConditionEntryField, TrustedAppConditionEntry[]>();

  entries.forEach((entry) => {
    // With the move to the Exception Lists api, the server side now validates individual
    // `process.hash.[type]`'s, so we need to account for that here
    const field = entry.field.startsWith('process.hash') ? ConditionEntryField.HASH : entry.field;

    groupedFields.set(field, [...(groupedFields.get(field) || []), entry]);
  });

  return [...groupedFields.entries()]
    .filter((entry) => entry[1].length > 1)
    .map((entry) => entry[0]);
};
