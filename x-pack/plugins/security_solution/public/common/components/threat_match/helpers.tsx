/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { i18n } from '@kbn/i18n';
import { addIdToItem } from '@kbn/securitysolution-utils';
import { ThreatMap, threatMap, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import { Entry, FormattedEntry, ThreatMapEntries, EmptyEntry } from './types';

/**
 * Formats the entry into one that is easily usable for the UI.
 *
 * @param patterns DataViewBase containing available fields on rule index
 * @param item item entry
 * @param itemIndex entry index
 */
export const getFormattedEntry = (
  indexPattern: DataViewBase,
  threatIndexPatterns: DataViewBase,
  item: Entry,
  itemIndex: number,
  uuidGen: () => string = uuid.v4
): FormattedEntry => {
  const { fields } = indexPattern;
  const { fields: threatFields } = threatIndexPatterns;
  const field = item.field;
  const threatField = item.value;
  const [foundField] = fields.filter(({ name }) => field != null && field === name);
  const [threatFoundField] = threatFields.filter(
    ({ name }) => threatField != null && threatField === name
  );
  const maybeId: typeof item & { id?: string } = item;
  return {
    id: maybeId.id ?? uuidGen(),
    field: foundField,
    type: 'mapping',
    value: threatFoundField,
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

export const getDefaultEmptyEntry = (): EmptyEntry => {
  return addIdToItem({
    field: '',
    type: 'mapping',
    value: '',
  });
};

export const getNewItem = (): ThreatMap => {
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

export const customValidators = {
  forbiddenField: (
    value: unknown,
    forbiddenString: string
  ): ReturnType<ValidationFunc<{}, ERROR_CODE>> => {
    let match: boolean;

    if (typeof value === 'string') {
      match = value === forbiddenString;
    } else if (Array.isArray(value)) {
      match = !!value.find((item) => item === forbiddenString);
    } else {
      match = false;
    }

    if (match) {
      return {
        code: 'ERR_FIELD_FORMAT',
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.threatMatchIndexForbiddenError',
          {
            defaultMessage:
              'The index pattern cannot be { forbiddenString }. Please choose a more specific index pattern.',
            values: {
              forbiddenString,
            },
          }
        ),
      };
    }
  },
};
