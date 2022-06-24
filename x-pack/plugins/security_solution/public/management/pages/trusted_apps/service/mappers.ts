/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  OsType,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import {
  EffectScope,
  NewTrustedApp,
  TrustedApp,
  TrustedAppConditionEntry,
  UpdateTrustedApp,
  ConditionEntriesMap,
} from '../../../../../common/endpoint/types';
import { tagsToEffectScope } from '../../../../../common/endpoint/service/trusted_apps/mapping';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../../common/endpoint/service/artifacts/constants';
import {
  conditionEntriesToEntries,
  entriesToConditionEntriesMap,
} from '../../../../common/utils/exception_list_items';

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

const filterUndefined = <T>(list: Array<T | undefined>): T[] => {
  return list.filter((item: T | undefined): item is T => item !== undefined);
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
    let groupedWin: ConditionEntriesMap<TrustedAppConditionEntry> = {};
    let groupedMacLinux: ConditionEntriesMap<
      TrustedAppConditionEntry<ConditionEntryField.HASH | ConditionEntryField.PATH>
    > = {};
    if (os === OperatingSystem.WINDOWS) {
      groupedWin = entriesToConditionEntriesMap<TrustedAppConditionEntry>(
        exceptionListItem.entries
      );
    } else {
      groupedMacLinux = entriesToConditionEntriesMap<
        TrustedAppConditionEntry<ConditionEntryField.HASH | ConditionEntryField.PATH>
      >(exceptionListItem.entries);
    }

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
            entries: filterUndefined<
              TrustedAppConditionEntry<ConditionEntryField.HASH | ConditionEntryField.PATH>
            >([
              groupedMacLinux[ConditionEntryField.HASH],
              groupedMacLinux[ConditionEntryField.PATH],
            ]),
          }
        : {
            os,
            entries: filterUndefined<TrustedAppConditionEntry>([
              groupedWin[ConditionEntryField.HASH],
              groupedWin[ConditionEntryField.PATH],
              groupedWin[ConditionEntryField.SIGNER],
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

const effectScopeToTags = (effectScope: EffectScope) => {
  if (effectScope.type === 'policy') {
    return effectScope.policies.map((policy) => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policy}`);
  } else {
    return [`${BY_POLICY_ARTIFACT_TAG_PREFIX}all`];
  }
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
    entries: conditionEntriesToEntries(entries, true),
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
    entries: conditionEntriesToEntries(entries, true),
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
