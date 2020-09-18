/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from 'kibana/server';

import {
  EntriesArray,
  ExceptionListSoSchema,
  NonEmptyNestedEntriesArray,
  entriesNested,
  entry,
} from '../../common/schemas';

const entryType = t.union([entry, entriesNested]);
type EntryType = t.TypeOf<typeof entryType>;

const migrateEntry = (entryToMigrate: EntryType): EntryType => {
  const newEntry = entryToMigrate;
  if (entriesNested.is(entryToMigrate) && entriesNested.is(newEntry)) {
    newEntry.entries = entryToMigrate.entries.map((nestedEntry) =>
      migrateEntry(nestedEntry)
    ) as NonEmptyNestedEntriesArray;
  }
  newEntry.field = entryToMigrate.field.replace('.text', '.lower');
  return newEntry;
};

const reduceOsTypes = (acc: string[], tag: string): string[] => {
  if (tag.startsWith('os:')) {
    return [...acc, tag.replace('os:', '')];
  }
  return [...acc];
};

export const migrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<ExceptionListSoSchema>
  ): SavedObjectSanitizedDoc<ExceptionListSoSchema> => ({
    ...doc,
    ...{
      attributes: {
        ...doc.attributes,
        ...(doc.attributes.entries &&
          doc.attributes.list_id === 'endpoint_list' && {
            entries: (doc.attributes.entries as EntriesArray).map<EntryType>(migrateEntry),
          }),
        ...(doc.attributes._tags &&
          doc.attributes._tags.reduce(reduceOsTypes, []).length > 0 && {
            os_types: doc.attributes._tags.reduce(reduceOsTypes, []),
          }),
      },
    },
    references: doc.references || [],
  }),
};
