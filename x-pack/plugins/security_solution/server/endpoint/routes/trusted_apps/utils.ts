/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { ExceptionListItemSchema } from '../../../../../lists/common/shared_exports';
import { NewTrustedApp, TrustedApp } from '../../../../common/endpoint/types';
import { ExceptionListClient } from '../../../../../lists/server';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../lists/common/constants';

type NewExceptionItem = Parameters<ExceptionListClient['createExceptionListItem']>[0];

/**
 * Map an ExcptionListItem to a TrustedApp item
 * @param exceptionListItem
 */
export const exceptionItemToTrustedAppItem = (
  exceptionListItem: ExceptionListItemSchema
): TrustedApp => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { entries, description, created_by, created_at, name, _tags, id } = exceptionListItem;
  const os = osFromTagsList(_tags);
  return {
    entries: entries.map((entry) => {
      if (entry.field.startsWith('process.hash')) {
        return {
          ...entry,
          field: 'process.hash.*',
        };
      }
      return entry;
    }),
    description,
    created_at,
    created_by,
    name,
    os,
    id,
  } as TrustedApp;
};

/**
 * Retrieves the OS entry from a list of tags (property returned with ExcptionListItem).
 * For Trusted Apps each entry must have at MOST 1 OS.
 * */
const osFromTagsList = (tags: string[]): TrustedApp['os'] | 'unknown' => {
  for (const tag of tags) {
    if (tag.startsWith('os:')) {
      return tag.substr(3) as TrustedApp['os'];
    }
  }
  return 'unknown';
};

export const newTrustedAppItemToExceptionItem = ({
  os,
  entries,
  name,
  description = '',
}: NewTrustedApp): NewExceptionItem => {
  return {
    _tags: tagsListFromOs(os),
    comments: [],
    description,
    // @ts-ignore
    entries: entries.map(({ value, ...newEntry }) => {
      let newValue = value.trim();

      if (newEntry.field === 'process.hash.*') {
        newValue = newValue.toLowerCase();
        newEntry.field = `process.hash.${hashType(newValue)}`;
      }

      return {
        ...newEntry,
        value: newValue,
      };
    }),
    itemId: uuid.v4(),
    listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
    meta: undefined,
    name: name.trim(),
    namespaceType: 'agnostic',
    tags: [],
    type: 'simple',
  };
};

const tagsListFromOs = (os: NewTrustedApp['os']): NewExceptionItem['_tags'] => {
  return [`os:${os}`];
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
