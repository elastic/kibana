/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConditionEntry, ConditionEntryField, OperatingSystem } from '../../types';

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

// based on https://github.com/elastic/endgame-tacotruck/blob/f7e03397a57180f09ecff48ca7a846fd7ae91075/src/taco/selectors/validators.js#L140
export const isValidPath = ({ os, value }: { os: OperatingSystem; value: string }): boolean => {
  if (os === OperatingSystem.WINDOWS) {
    const filePathRegex = /^(?:[a-z]:|\\\\[^<>:"'/\\|?*]+\\[^<>:"'/\\|?*]+|%\w+%|)[\\](?:[^<>:"'/\\|?*]+[\\/])*([^<>:"'/\\|?*])+$/i;
    return filePathRegex.test(value);
  }
  return /^(\/|(\/[\w]+)+|\/[\w]+\.[\w]+|(\/[\w]+)+\/[\w]+\.[\w]+)$/.test(value);
};

// based on https://github.com/elastic/endgame-tacotruck/blob/f7e03397a57180f09ecff48ca7a846fd7ae91075/src/taco/selectors/validators.js#L149
export const isWindowsWildcardPathValid = (path: string) => {
  const firstCharacter = path[0];
  const lastCharacter = path.slice(-1);
  const trimmedValue = path.trim();
  if (path.length === 0) {
    return false;
  } else if (
    trimmedValue.length !== path.length ||
    firstCharacter === '^' ||
    lastCharacter === '\\' ||
    (path.includes('\\') === false && path.includes('*') === false)
  ) {
    return false;
  } else {
    return true;
  }
};

// based on https://github.com/elastic/endgame-tacotruck/blob/f7e03397a57180f09ecff48ca7a846fd7ae91075/src/taco/selectors/validators.js#L167
export const isMacWildcardPathValid = (path: string) => {
  const firstCharacter = path[0];
  const lastCharacter = path.slice(-1);
  const trimmedValue = path.trim();
  if (path.length === 0) {
    return false;
  } else if (
    trimmedValue.length !== path.length ||
    firstCharacter !== '/' ||
    lastCharacter === '/' ||
    path.length > 1024 === true ||
    path.includes('//') === true ||
    containsMoreThanOneWildcard(path) === true
  ) {
    return false;
  } else {
    return true;
  }
};

const containsMoreThanOneWildcard = (path: string) => {
  for (const pathComponent of path.split('/')) {
    if (/\*.*\*/.test(pathComponent) === true) {
      return true;
    }
  }
  return false;
};
