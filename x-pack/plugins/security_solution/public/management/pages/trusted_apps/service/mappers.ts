/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  EntriesArray,
  EntryMatch,
  EntryMatchWildcard,
  EntryNested,
  ExceptionListItemSchema,
  NestedEntriesArray,
  OsType,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import {
  ConditionEntry,
  ConditionEntryField,
  EffectScope,
  NewTrustedApp,
  OperatingSystem,
  TrustedApp,
  TrustedAppEntryTypes,
  UpdateTrustedApp,
} from '../../../../../common/endpoint/types';
import { tagsToEffectScope } from '../../../../../common/endpoint/service/trusted_apps/mapping';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../../common/endpoint/service/artifacts/constants';

type ConditionEntriesMap = { [K in ConditionEntryField]?: ConditionEntry<K> };
type Mapping<T extends string, U> = { [K in T]: U };

const OS_TYPE_TO_OPERATING_SYSTEM: Mapping<OsType, OperatingSystem> = {
  linux: OperatingSystem.LINUX,
  macos: OperatingSystem.MAC,
  windows: OperatingSystem.WINDOWS,
};

const OPERATING_SYSTEM_TO_OS_TYPE: Mapping<OperatingSystem, OsType> = {
  [OperatingSystem.LINUX]: 'linux',
  [OperatingSystem.MAC]: 'macos',
  [OperatingSystem.WINDOWS]: 'windows',
};

const OPERATOR_VALUE = 'included';

const filterUndefined = <T>(list: Array<T | undefined>): T[] => {
  return list.filter((item: T | undefined): item is T => item !== undefined);
};

const createConditionEntry = <T extends ConditionEntryField>(
  field: T,
  type: TrustedAppEntryTypes,
  value: string
): ConditionEntry<T> => {
  return { field, value, type, operator: OPERATOR_VALUE };
};

const entriesToConditionEntriesMap = (entries: EntriesArray): ConditionEntriesMap => {
  return entries.reduce((result, entry) => {
    if (entry.field.startsWith('process.hash') && entry.type === 'match') {
      return {
        ...result,
        [ConditionEntryField.HASH]: createConditionEntry(
          ConditionEntryField.HASH,
          entry.type,
          entry.value
        ),
      };
    } else if (
      entry.field === 'process.executable.caseless' &&
      (entry.type === 'match' || entry.type === 'wildcard')
    ) {
      return {
        ...result,
        [ConditionEntryField.PATH]: createConditionEntry(
          ConditionEntryField.PATH,
          entry.type,
          entry.value
        ),
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
            subjectNameCondition.type,
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
    const os = osFromExceptionItem(exceptionListItem);
    const grouped = entriesToConditionEntriesMap(exceptionListItem.entries);

    return {
      id: exceptionListItem.item_id,
      version: exceptionListItem._version || '',
      name: exceptionListItem.name,
      description: exceptionListItem.description,
      effectScope: tagsToEffectScope(exceptionListItem.tags),
      created_at: exceptionListItem.created_at,
      created_by: exceptionListItem.created_by,
      updated_at: exceptionListItem.updated_at,
      updated_by: exceptionListItem.updated_by,
      ...(os === OperatingSystem.LINUX || os === OperatingSystem.MAC
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

const osFromExceptionItem = (exceptionListItem: ExceptionListItemSchema): TrustedApp['os'] => {
  return OS_TYPE_TO_OPERATING_SYSTEM[exceptionListItem.os_types[0]];
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

const createEntryMatch = (field: string, value: string): EntryMatch => {
  return { field, value, type: 'match', operator: OPERATOR_VALUE };
};

const createEntryMatchWildcard = (field: string, value: string): EntryMatchWildcard => {
  return { field, value, type: 'wildcard', operator: OPERATOR_VALUE };
};

const createEntryNested = (field: string, entries: NestedEntriesArray): EntryNested => {
  return { field, entries, type: 'nested' };
};

const effectScopeToTags = (effectScope: EffectScope) => {
  if (effectScope.type === 'policy') {
    return effectScope.policies.map((policy) => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policy}`);
  } else {
    return [`${BY_POLICY_ARTIFACT_TAG_PREFIX}all`];
  }
};

const conditionEntriesToEntries = (conditionEntries: ConditionEntry[]): EntriesArray => {
  return conditionEntries.map((conditionEntry) => {
    if (conditionEntry.field === ConditionEntryField.HASH) {
      return createEntryMatch(
        `process.hash.${hashType(conditionEntry.value)}`,
        conditionEntry.value.toLowerCase()
      );
    } else if (conditionEntry.field === ConditionEntryField.SIGNER) {
      return createEntryNested(`process.Ext.code_signature`, [
        createEntryMatch('trusted', 'true'),
        createEntryMatch('subject_name', conditionEntry.value),
      ]);
    } else if (
      conditionEntry.field === ConditionEntryField.PATH &&
      conditionEntry.type === 'wildcard'
    ) {
      return createEntryMatchWildcard(`process.executable.caseless`, conditionEntry.value);
    } else {
      return createEntryMatch(`process.executable.caseless`, conditionEntry.value);
    }
  });
};

/**
 * Map NewTrustedApp to CreateExceptionListItemOptions.
 */
export const newTrustedAppToCreateExceptionListItem = ({
  os,
  entries,
  name,
  description = '',
  effectScope,
}: NewTrustedApp): CreateExceptionListItemSchema => {
  return {
    comments: [],
    description,
    entries: conditionEntriesToEntries(entries),
    list_id: ENDPOINT_TRUSTED_APPS_LIST_ID,
    meta: undefined,
    name,
    namespace_type: 'agnostic',
    os_types: [OPERATING_SYSTEM_TO_OS_TYPE[os]],
    tags: effectScopeToTags(effectScope),
    type: 'simple',
  };
};

/**
 * Map UpdateTrustedApp to UpdateExceptionListItemOptions
 *
 * @param {ExceptionListItemSchema} currentTrustedAppExceptionItem
 * @param {UpdateTrustedApp} updatedTrustedApp
 */
export const updatedTrustedAppToUpdateExceptionListItem = (
  {
    id,
    item_id: itemId,
    namespace_type: namespaceType,
    type,
    comments,
    meta,
  }: ExceptionListItemSchema,
  { os, entries, name, description = '', effectScope, version }: UpdateTrustedApp
): UpdateExceptionListItemSchema => {
  return {
    _version: version,
    name,
    description,
    entries: conditionEntriesToEntries(entries),
    os_types: [OPERATING_SYSTEM_TO_OS_TYPE[os]],
    tags: effectScopeToTags(effectScope),

    // Copied from current trusted app exception item
    id,
    comments,
    item_id: itemId,
    meta,
    namespace_type: namespaceType,
    type,
  };
};
