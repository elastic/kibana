/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { addIdToItem } from '@kbn/securitysolution-utils';
import type { ThreatMap } from '@kbn/securitysolution-io-ts-alerting-types';

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { Entry, FormattedEntry, ThreatMapEntries, EmptyEntry } from './types';

/**
 * Formats the entry into one that is easily usable for the UI.
 */
export const getFormattedEntry = (
  dataView: DataViewBase,
  threatDataView: DataViewBase,
  item: Entry,
  itemIndex: number,
  uuidGen: () => string = uuidv4
): FormattedEntry => {
  const { fields } = dataView;
  const { fields: threatFields } = threatDataView;
  const field = item.field;
  const threatField = item.value;
  const [foundField] = fields.filter(({ name }) => field != null && field === name);
  const [threatFoundField] = threatFields.filter(
    ({ name }) => threatField != null && threatField === name
  );
  const maybeId: typeof item & { id?: string } = item;

  // Fallback to a string field when field isn't found in known fields.
  // It's required for showing field's value when appropriate data is missing in ES.
  return {
    id: maybeId.id ?? uuidGen(),
    field: foundField ?? {
      name: field,
      type: 'string',
    },
    type: 'mapping',
    value: threatFoundField ?? {
      name: threatField,
      type: 'string',
    },
    entryIndex: itemIndex,
  };
};

/**
 * Formats the entries to be easily usable for the UI
 *
 * @param patterns DataViewBase containing available fields on rule index
 * @param entries item entries
 */
export const getFormattedEntries = (
  indexPattern: DataViewBase,
  threatIndexPatterns: DataViewBase,
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
  newField: DataViewFieldBase
): { updatedEntry: Entry; index: number } => {
  const { entryIndex } = item;
  return {
    updatedEntry: {
      id: item.id,
      field: newField != null ? newField.name : '',
      type: 'mapping',
      value: item.value != null ? item.value.name : '',
    } as Entry, // Cast to Entry since id is only used as a react key prop and can be ignored elsewhere
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
  newField: DataViewFieldBase
): { updatedEntry: Entry; index: number } => {
  const { entryIndex } = item;
  return {
    updatedEntry: {
      id: item.id,
      field: item.field != null ? item.field.name : '',
      type: 'mapping',
      value: newField != null ? newField.name : '',
    } as Entry, // Cast to Entry since id is only used as a react key prop and can be ignored elsewhere
    index: entryIndex,
  };
};

export const createAndNewEntryItem = (): EmptyEntry => {
  return addIdToItem({
    field: '',
    type: 'mapping',
    value: '',
  });
};

export const createOrNewEntryItem = (): ThreatMap => {
  return addIdToItem({
    entries: [
      addIdToItem({
        field: '',
        type: 'mapping',
        value: '',
      }),
    ],
  });
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
