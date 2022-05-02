/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConditionEntry,
  ConditionEntryField,
  OperatingSystem,
  TrustedAppEntryTypes,
} from '../../types';

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

/**
 * checks if the filename of a given path (if any) is a simple executable (does NOT have the
 * wildcards supported by endpoing (`*` and `?`))
 * @param os
 * @param type
 * @param value
 */
export const hasSimpleExecutableName = ({
  os,
  type,
  value,
}: {
  os: OperatingSystem;
  type: TrustedAppEntryTypes;
  value: string;
}): boolean => {
  if (type !== 'wildcard') {
    return true;
  }

  const separator = os === OperatingSystem.WINDOWS ? '\\' : '/';
  const lastString = value.split(separator).pop();

  if (!lastString) {
    return false;
  }

  return (lastString.split('*').length || lastString.split('?').length) === 1;
};

export const isPathValid = ({
  os,
  field,
  type,
  value,
}: {
  os: OperatingSystem;
  field: ConditionEntryField;
  type: TrustedAppEntryTypes;
  value: string;
}): boolean => {
  if (field === ConditionEntryField.PATH) {
    if (type === 'wildcard') {
      return os === OperatingSystem.WINDOWS
        ? isWindowsWildcardPathValid(value)
        : isLinuxMacWildcardPathValid(value);
    }
    return doesPathMatchRegex({ value, os });
  }
  return true;
};

const doesPathMatchRegex = ({ os, value }: { os: OperatingSystem; value: string }): boolean => {
  if (os === OperatingSystem.WINDOWS) {
    const filePathRegex =
      /^[a-z]:(?:|\\\\[^<>:"'/\\|?*]+\\[^<>:"'/\\|?*]+|%\w+%|)[\\](?:[^<>:"'/\\|?*]+[\\/])*([^<>:"'/\\|?*])+$/i;
    return filePathRegex.test(value);
  }
  return /^(\/|(\/[\w\-]+)+|\/[\w\-]+\.[\w]+|(\/[\w-]+)+\/[\w\-]+\.[\w]+)$/i.test(value);
};

const isWindowsWildcardPathValid = (path: string): boolean => {
  const firstCharacter = path[0];
  const lastCharacter = path.slice(-1);
  const trimmedValue = path.trim();
  const hasSlash = /\//.test(trimmedValue);
  if (path.length === 0) {
    return false;
  } else if (
    hasSlash ||
    trimmedValue.length !== path.length ||
    firstCharacter === '^' ||
    lastCharacter === '\\' ||
    !hasWildcard({ path, isWindowsPath: true })
  ) {
    return false;
  } else {
    return true;
  }
};

const isLinuxMacWildcardPathValid = (path: string): boolean => {
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
    !hasWildcard({ path, isWindowsPath: false })
  ) {
    return false;
  } else {
    return true;
  }
};

const hasWildcard = ({
  path,
  isWindowsPath,
}: {
  path: string;
  isWindowsPath: boolean;
}): boolean => {
  for (const pathComponent of path.split(isWindowsPath ? '\\' : '/')) {
    if (/[\*|\?]+/.test(pathComponent) === true) {
      return true;
    }
  }
  return false;
};
