/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

import { OsType } from '../../../../../lists/common/schemas/common';
import {
  EntriesArray,
  EntryMatch,
  EntryNested,
  ExceptionListItemSchema,
  NestedEntriesArray,
} from '../../../../../lists/common/shared_exports';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';
import { CreateExceptionListItemOptions } from '../../../../../lists/server';
import {
  ConditionEntryField,
  ConditionEntry,
  NewTrustedApp,
  OperatingSystem,
  TrustedApp,
} from '../../../../common/endpoint/types';

type ConditionEntriesMap = { [K in ConditionEntryField]?: ConditionEntry<K> };
type Mapping<T extends string, U> = { [K in T]: U };

const OS_TYPE_TO_OPERATING_SYSTEM: Mapping<OsType, OperatingSystem> = {
  linux: 'linux',
  macos: 'macos',
  windows: 'windows',
};

const OPERATING_SYSTEM_TO_OS_TYPE: Mapping<OperatingSystem, OsType> = {
  linux: 'linux',
  macos: 'macos',
  windows: 'windows',
};

const filterUndefined = <T>(list: Array<T | undefined>): T[] => {
  return list.filter((item: T | undefined): item is T => item !== undefined);
};

export const createConditionEntry = <T extends ConditionEntryField>(
  field: T,
  value: string
): ConditionEntry<T> => {
  return { field, value, type: 'match', operator: 'included' };
};

export const entriesToConditionEntriesMap = (entries: EntriesArray): ConditionEntriesMap => {
  return entries.reduce((result, entry) => {
    if (entry.field.startsWith('process.hash') && entry.type === 'match') {
      return {
        ...result,
        [ConditionEntryField.HASH]: createConditionEntry(ConditionEntryField.HASH, entry.value),
      };
    } else if (entry.field === 'process.executable.caseless' && entry.type === 'match') {
      return {
        ...result,
        [ConditionEntryField.PATH]: createConditionEntry(ConditionEntryField.PATH, entry.value),
      };
    } else if (entry.field === 'process.Ext.code_signature' && entry.type === 'nested') {
      const subjectNameCondition = entry.entries.find((subEntry): subEntry is EntryMatch => {
        return subEntry.field === 'subject_name' && subEntry.type === 'match';
      });

      if (subjectNameCondition) {
        return {
          ...result,
          [ConditionEntryField.SIGNER]: createConditionEntry(
            ConditionEntryField.SIGNER,
            subjectNameCondition.value
          ),
        };
      }
    }

    return result;
  }, {} as ConditionEntriesMap);
};

/**
 * Map an ExceptionListItem to a TrustedApp item
 * @param exceptionListItem
 */
export const exceptionListItemToTrustedApp = (
  exceptionListItem: ExceptionListItemSchema
): TrustedApp => {
  if (exceptionListItem.os_types[0]) {
    const os = OS_TYPE_TO_OPERATING_SYSTEM[exceptionListItem.os_types[0]];
    const grouped = entriesToConditionEntriesMap(exceptionListItem.entries);

    return {
      id: exceptionListItem.id,
      name: exceptionListItem.name,
      description: exceptionListItem.description,
      created_at: exceptionListItem.created_at,
      created_by: exceptionListItem.created_by,
      ...(os === 'linux' || os === 'macos'
        ? {
            os,
            entries: filterUndefined([
              grouped[ConditionEntryField.HASH],
              grouped[ConditionEntryField.PATH],
            ]),
          }
        : {
            os,
            entries: filterUndefined([
              grouped[ConditionEntryField.HASH],
              grouped[ConditionEntryField.PATH],
              grouped[ConditionEntryField.SIGNER],
            ]),
          }),
    };
  } else {
    throw new Error('Unknown Operating System assigned to trusted application.');
  }
};

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

export const createEntryMatch = (field: string, value: string): EntryMatch => {
  return { field, value, type: 'match', operator: 'included' };
};

export const createEntryNested = (field: string, entries: NestedEntriesArray): EntryNested => {
  return { field, entries, type: 'nested' };
};

export const conditionEntriesToEntries = (
  conditionEntries: Array<ConditionEntry<ConditionEntryField>>
): EntriesArray => {
  return conditionEntries.map((conditionEntry) => {
    if (conditionEntry.field === ConditionEntryField.HASH) {
      return createEntryMatch(
        `process.hash.${hashType(conditionEntry.value)}`,
        conditionEntry.value
      );
    } else if (conditionEntry.field === ConditionEntryField.SIGNER) {
      return createEntryNested(`process.Ext.code_signature`, [
        createEntryMatch('trusted', 'true'),
        createEntryMatch('subject_name', conditionEntry.value),
      ]);
    } else {
      return createEntryMatch(`process.executable.caseless`, conditionEntry.value);
    }
  });
};

/**
 * Map NewTrustedApp to CreateExceptionListItemOptions.
 */
export const newTrustedAppToCreateExceptionListItemOptions = ({
  os,
  entries,
  name,
  description = '',
}: NewTrustedApp): CreateExceptionListItemOptions => {
  return {
    comments: [],
    description,
    entries: conditionEntriesToEntries(entries),
    itemId: uuid.v4(),
    listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
    meta: undefined,
    name,
    namespaceType: 'agnostic',
    osTypes: [OPERATING_SYSTEM_TO_OS_TYPE[os]],
    tags: [],
    type: 'simple',
  };
};
