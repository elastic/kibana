/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EntriesArray,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
  EntryNested,
  NestedEntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { AllConditionEntryFields, EntryFieldType, EntryTypes } from '@kbn/securitysolution-utils';

import { ConditionEntriesMap, ConditionEntry } from '../../../../common/endpoint/types';

const OPERATOR_VALUE = 'included';

const hashType = (hash: string): 'md5' | 'sha256' | 'sha1' | undefined => {
  switch (hash.length) {
    case 32:
      return 'md5';
    case 40:
      return 'sha1';
    case 64:
      return 'sha256';
  }
};

const createEntryMatch = (field: string, value: string): EntryMatch => {
  return { field, value, type: 'match', operator: OPERATOR_VALUE };
};

const createEntryMatchAny = (field: string, value: string[]): EntryMatchAny => {
  return { field, value, type: 'match_any', operator: OPERATOR_VALUE };
};

const createEntryMatchWildcard = (field: string, value: string): EntryMatchWildcard => {
  return { field, value, type: 'wildcard', operator: OPERATOR_VALUE };
};

const createEntryNested = (field: string, entries: NestedEntriesArray): EntryNested => {
  return { field, entries, type: 'nested' };
};

function groupHashEntry(prefix: 'process' | 'file', conditionEntry: ConditionEntry): EntriesArray {
  const entriesArray: EntriesArray = [];

  if (!Array.isArray(conditionEntry.value)) {
    const entry = createEntryMatch(
      `${prefix}${EntryFieldType.HASH}${hashType(conditionEntry.value)}`,
      conditionEntry.value.toLowerCase()
    );
    entriesArray.push(entry);
    return entriesArray;
  }

  const hashTypeGroups: { md5: string[]; sha1: string[]; sha256: string[] } =
    conditionEntry.value.reduce(
      (memo, val) => {
        const type = hashType(val);
        if (!type) return memo;

        return {
          ...memo,
          [type]: [...memo[type], val],
        };
      },
      {
        md5: [],
        sha1: [],
        sha256: [],
      } as { md5: string[]; sha1: string[]; sha256: string[] }
    );
  Object.entries(hashTypeGroups).forEach(([type, values]) => {
    if (!values.length) {
      return;
    }

    const entry = createEntryMatchAny(`${prefix}${EntryFieldType.HASH}${type}`, values);
    entriesArray.push(entry);
  });

  return entriesArray;
}

function createNestedSignatureEntry(
  field: AllConditionEntryFields,
  value: string | string[],
  isTrustedApp: boolean = false
): EntryNested {
  const subjectNameMatch = Array.isArray(value)
    ? createEntryMatchAny('subject_name', value)
    : createEntryMatch('subject_name', value);
  const nestedEntries: EntryNested['entries'] = [];
  if (isTrustedApp) nestedEntries.push(createEntryMatch('trusted', 'true'));
  nestedEntries.push(subjectNameMatch);
  return createEntryNested(field, nestedEntries);
}

function createWildcardPathEntry(
  field: AllConditionEntryFields,
  value: string | string[]
): EntryMatchWildcard | EntryMatchAny {
  return Array.isArray(value)
    ? createEntryMatchAny(field, value)
    : createEntryMatchWildcard(field, value);
}

function createPathEntry(
  field: AllConditionEntryFields,
  value: string | string[]
): EntryMatch | EntryMatchAny {
  return Array.isArray(value) ? createEntryMatchAny(field, value) : createEntryMatch(field, value);
}

export const conditionEntriesToEntries = (
  conditionEntries: ConditionEntry[],
  isTrustedApp: boolean = false
): EntriesArray => {
  const entriesArray: EntriesArray = [];

  conditionEntries.forEach((conditionEntry) => {
    if (conditionEntry.field.includes(EntryFieldType.HASH)) {
      const prefix = conditionEntry.field.split('.')[0] as 'process' | 'file';
      groupHashEntry(prefix, conditionEntry).forEach((entry) => entriesArray.push(entry));
    } else if (conditionEntry.field.includes(EntryFieldType.SIGNER)) {
      const entry = createNestedSignatureEntry(
        conditionEntry.field,
        conditionEntry.value,
        isTrustedApp
      );
      entriesArray.push(entry);
    } else if (
      (conditionEntry.field.includes(EntryFieldType.EXECUTABLE) ||
        conditionEntry.field.includes(EntryFieldType.PATH)) &&
      conditionEntry.type === 'wildcard'
    ) {
      const entry = createWildcardPathEntry(conditionEntry.field, conditionEntry.value);
      entriesArray.push(entry);
    } else {
      const entry = createPathEntry(conditionEntry.field, conditionEntry.value);
      entriesArray.push(entry);
    }
  });

  return entriesArray;
};

const createConditionEntry = (
  field: AllConditionEntryFields,
  type: EntryTypes,
  value: string | string[]
): ConditionEntry => {
  return { field, value, type, operator: OPERATOR_VALUE };
};

function createWildcardHashField(
  field: string
): Extract<AllConditionEntryFields, 'process.hash.*' | 'file.hash.*'> {
  const prefix = field.split('.')[0] as 'process' | 'file';
  return `${prefix}${EntryFieldType.HASH}*`;
}

export const entriesToConditionEntriesMap = <T extends ConditionEntry = ConditionEntry>(
  entries: EntriesArray
): ConditionEntriesMap<T> => {
  return entries.reduce((memo: ConditionEntriesMap<T>, entry) => {
    const field = entry.field as AllConditionEntryFields;
    if (field.includes(EntryFieldType.HASH) && entry.type === 'match') {
      const wildcardHashField = createWildcardHashField(field);
      return {
        ...memo,
        [wildcardHashField]: createConditionEntry(wildcardHashField, entry.type, entry.value),
      } as ConditionEntriesMap<T>;
    } else if (field.includes(EntryFieldType.HASH) && entry.type === 'match_any') {
      const wildcardHashField = createWildcardHashField(field);
      const currentValues = (memo[wildcardHashField]?.value as string[]) ?? [];

      return {
        ...memo,
        [wildcardHashField]: createConditionEntry(wildcardHashField, entry.type, [
          ...currentValues,
          ...entry.value,
        ]),
      } as ConditionEntriesMap<T>;
    } else if (
      (field.includes(EntryFieldType.EXECUTABLE) || field.includes(EntryFieldType.PATH)) &&
      (entry.type === 'match' || entry.type === 'match_any' || entry.type === 'wildcard')
    ) {
      return {
        ...memo,
        [field]: createConditionEntry(field, entry.type, entry.value),
      } as ConditionEntriesMap<T>;
    } else if (field.includes(EntryFieldType.SIGNER) && entry.type === 'nested') {
      const subjectNameCondition = entry.entries.find((subEntry): subEntry is EntryMatch => {
        return (
          subEntry.field === 'subject_name' &&
          (subEntry.type === 'match' || subEntry.type === 'match_any')
        );
      });

      if (subjectNameCondition) {
        return {
          ...memo,
          [field]: createConditionEntry(
            field,
            subjectNameCondition.type,
            subjectNameCondition.value
          ),
        } as ConditionEntriesMap<T>;
      }
    }

    return memo;
  }, {} as ConditionEntriesMap<T>);
};

export const entriesToConditionEntries = <T extends ConditionEntry = ConditionEntry>(
  entries: EntriesArray
): ConditionEntry[] => {
  const conditionEntriesMap: ConditionEntriesMap<T> = entriesToConditionEntriesMap(entries);

  return Object.values(conditionEntriesMap).reduce((memo, entry) => {
    if (!entry) return memo;
    return [...memo, entry];
  }, [] as ConditionEntry[]);
};
