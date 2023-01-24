/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import {
  EntriesArray,
  NonEmptyNestedEntriesArray,
  OsTypeArray,
  entriesNested,
  entry,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';

import { ExceptionListSoSchema } from '../schemas/saved_objects';

const entryType = t.union([entry, entriesNested]);
type EntryType = t.TypeOf<typeof entryType>;

const migrateEntry = (entryToMigrate: EntryType): EntryType => {
  const newEntry = entryToMigrate;
  if (entriesNested.is(entryToMigrate) && entriesNested.is(newEntry)) {
    newEntry.entries = entryToMigrate.entries.map((nestedEntry) =>
      migrateEntry(nestedEntry)
    ) as NonEmptyNestedEntriesArray;
  }
  newEntry.field = entryToMigrate.field.replace('.text', '.caseless');
  return newEntry;
};

const reduceOsTypes = (acc: string[], tag: string): string[] => {
  if (tag.startsWith('os:')) {
    // TODO: check OS against type
    return [...acc, tag.replace('os:', '')];
  }
  return [...acc];
};

const containsPolicyTags = (tags: string[]): boolean =>
  tags.some((tag) => tag.startsWith('policy:'));

export type OldExceptionListSoSchema = ExceptionListSoSchema & {
  _tags: string[];
};

export const migrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<OldExceptionListSoSchema>
  ): SavedObjectSanitizedDoc<ExceptionListSoSchema> => ({
    ...doc,
    ...{
      attributes: {
        ...doc.attributes,
        ...(doc.attributes.entries &&
          [ENDPOINT_LIST_ID, ENDPOINT_TRUSTED_APPS_LIST_ID].includes(doc.attributes.list_id) && {
            entries: (doc.attributes.entries as EntriesArray).map<EntryType>(migrateEntry),
          }),
        ...(doc.attributes._tags &&
          doc.attributes._tags.reduce(reduceOsTypes, []).length > 0 && {
            os_types: doc.attributes._tags.reduce(reduceOsTypes, []) as OsTypeArray,
          }),
      },
    },
    references: doc.references || [],
  }),
  '7.12.0': (
    doc: SavedObjectUnsanitizedDoc<ExceptionListSoSchema>
  ): SavedObjectSanitizedDoc<ExceptionListSoSchema> => {
    if (doc.attributes.list_id === ENDPOINT_TRUSTED_APPS_LIST_ID) {
      return {
        ...doc,
        ...{
          attributes: {
            ...doc.attributes,
            tags: [
              ...(doc.attributes.tags || []),
              ...(containsPolicyTags(doc.attributes.tags) ? [] : ['policy:all']),
            ],
          },
        },
        references: doc.references || [],
      };
    } else {
      return { ...doc, references: doc.references || [] };
    }
  },
};
