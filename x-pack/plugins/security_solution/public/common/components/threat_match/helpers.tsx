/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ThreatMap,
  threatMap,
  ThreatMapping,
} from '../../../../common/detection_engine/schemas/types';

import { IndexPattern, IFieldType } from '../../../../../../../src/plugins/data/common';
import { Entry, FormattedEntry, ThreatMapEntries, EmptyEntry } from './types';

/**
 * Formats the entry into one that is easily usable for the UI.
 *
 * @param patterns IndexPattern containing available fields on rule index
 * @param item item entry
 * @param itemIndex entry index
 */
export const getFormattedEntry = (
  indexPattern: IndexPattern,
  threatIndexPatterns: IndexPattern,
  item: Entry,
  itemIndex: number
): FormattedEntry => {
  const { fields } = indexPattern;
  const { fields: threatFields } = threatIndexPatterns;
  const field = item.field;
  const threatField = item.value;
  const [foundField] = fields.filter(({ name }) => field != null && field === name);
  const [threatFoundField] = threatFields.filter(
    ({ name }) => threatField != null && threatField === name
  );
  return {
    field: foundField,
    type: 'mapping',
    value: threatFoundField,
    entryIndex: itemIndex,
  };
};

/**
 * Formats the entries to be easily usable for the UI
 *
 * @param patterns IndexPattern containing available fields on rule index
 * @param entries item entries
 */
export const getFormattedEntries = (
  indexPattern: IndexPattern,
  threatIndexPatterns: IndexPattern,
  entries: Entry[]
): FormattedEntry[] => {
  return entries.reduce<FormattedEntry[]>((acc, item, index) => {
    const newItemEntry = getFormattedEntry(indexPattern, threatIndexPatterns, item, index);
    return [...acc, newItemEntry];
  }, []);
};

/**
 * Determines whether an entire entry or item need to be removed
 *
 * @param item
 * @param entryIndex index of given entry
 *
 */
export const getUpdatedEntriesOnDelete = (
  item: ThreatMapEntries,
  entryIndex: number
): ThreatMapEntries => {
  return {
    ...item,
    entries: [...item.entries.slice(0, entryIndex), ...item.entries.slice(entryIndex + 1)],
  };
};

/**
 * Determines proper entry update when user selects new field
 *
 * @param item - current item entry values
 * @param newField - newly selected field
 *
 */
export const getEntryOnFieldChange = (
  item: FormattedEntry,
  newField: IFieldType
): { updatedEntry: Entry; index: number } => {
  const { entryIndex } = item;
  return {
    updatedEntry: {
      field: newField != null ? newField.name : '',
      type: 'mapping',
      value: item.value != null ? item.value.name : '',
    },
    index: entryIndex,
  };
};

/**
 * Determines proper entry update when user selects new field
 *
 * @param item - current item entry values
 * @param newField - newly selected field
 *
 */
export const getEntryOnThreatFieldChange = (
  item: FormattedEntry,
  newField: IFieldType
): { updatedEntry: Entry; index: number } => {
  const { entryIndex } = item;
  return {
    updatedEntry: {
      field: item.field != null ? item.field.name : '',
      type: 'mapping',
      value: newField != null ? newField.name : '',
    },
    index: entryIndex,
  };
};

export const getDefaultEmptyEntry = (): EmptyEntry => ({
  field: '',
  type: 'mapping',
  value: '',
});

export const getNewItem = (): ThreatMap => {
  return {
    entries: [
      {
        field: '',
        type: 'mapping',
        value: '',
      },
    ],
  };
};

export const filterItems = (items: ThreatMapEntries[]): ThreatMapping => {
  return items.reduce<ThreatMapping>((acc, item) => {
    const newItem = { ...item, entries: item.entries };
    if (threatMap.is(newItem)) {
      return [...acc, newItem];
    } else {
      return acc;
    }
  }, []);
};

/**
 * Given a list of items checks each one to see if any of them have an empty field
 * or an empty value.
 * @param items The items to check if we have an empty entries.
 */
export const containsInvalidItems = (items: ThreatMapEntries[]): boolean => {
  return items.some((item) =>
    item.entries.some((subEntry) => subEntry.field === '' || subEntry.value === '')
  );
};

/**
 * Given a list of items checks if we have a single empty entry and if we do returns true.
 * @param items The items to check if we have a single empty entry.
 */
export const singleEntryThreat = (items: ThreatMapEntries[]): boolean => {
  return (
    items.length === 1 &&
    items[0].entries.length === 1 &&
    items[0].entries[0].field === '' &&
    items[0].entries[0].value === ''
  );
};
