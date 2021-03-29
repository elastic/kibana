/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { IIndexPattern, IFieldType } from '../../../../../../../../src/plugins/data/common';
import {
  OperatorTypeEnum,
  EntryNested,
  ExceptionListType,
  OperatorEnum,
} from '../../../../lists_plugin_deps';
import { isOperator } from '../../autocomplete/operators';
import {
  FormattedBuilderEntry,
  ExceptionsBuilderExceptionItem,
  EmptyEntry,
  EmptyNestedEntry,
  BuilderEntry,
} from '../types';
import { getEntryValue, getExceptionOperatorSelect } from '../helpers';
import exceptionableFields from '../exceptionable_fields.json';

export const filterIndexPatterns = (
  patterns: IIndexPattern,
  type: ExceptionListType
): IIndexPattern => {
  return type === 'endpoint'
    ? {
        ...patterns,
        fields: patterns.fields.filter(({ name }) => exceptionableFields.includes(name)),
      }
    : patterns;
};

/**
 * Fields of type 'text' do not generate autocomplete values, we want
 * to find it's corresponding keyword type (if available) which does
 * generate autocomplete values
 *
 * @param fields IFieldType fields
 * @param selectedField the field name that was selected
 * @param isTextType we only want a corresponding keyword field if
 * the selected field is of type 'text'
 *
 */
export const getCorrespondingKeywordField = ({
  fields,
  selectedField,
}: {
  fields: IFieldType[];
  selectedField: string | undefined;
}): IFieldType | undefined => {
  const selectedFieldBits =
    selectedField != null && selectedField !== '' ? selectedField.split('.') : [];
  const selectedFieldIsTextType = selectedFieldBits.slice(-1)[0] === 'text';

  if (selectedFieldIsTextType && selectedFieldBits.length > 0) {
    const keywordField = selectedFieldBits.slice(0, selectedFieldBits.length - 1).join('.');
    const [foundKeywordField] = fields.filter(
      ({ name }) => keywordField !== '' && keywordField === name
    );
    return foundKeywordField;
  }

  return undefined;
};

/**
 * Formats the entry into one that is easily usable for the UI, most of the
 * complexity was introduced with nested fields
 *
 * @param patterns IIndexPattern containing available fields on rule index
 * @param item exception item entry
 * @param itemIndex entry index
 * @param parent nested entries hold copy of their parent for use in various logic
 * @param parentIndex corresponds to the entry index, this might seem obvious, but
 * was added to ensure that nested items could be identified with their parent entry
 */
export const getFormattedBuilderEntry = (
  indexPattern: IIndexPattern,
  item: BuilderEntry,
  itemIndex: number,
  parent: EntryNested | undefined,
  parentIndex: number | undefined
): FormattedBuilderEntry => {
  const { fields } = indexPattern;
  const field = parent != null ? `${parent.field}.${item.field}` : item.field;
  const [foundField] = fields.filter(({ name }) => field != null && field === name);
  const correspondingKeywordField = getCorrespondingKeywordField({
    fields,
    selectedField: field,
  });

  if (parent != null && parentIndex != null) {
    return {
      field:
        foundField != null
          ? { ...foundField, name: foundField.name.split('.').slice(-1)[0] }
          : foundField,
      correspondingKeywordField,
      id: item.id ?? `${itemIndex}`,
      operator: getExceptionOperatorSelect(item),
      value: getEntryValue(item),
      nested: 'child',
      parent: { parent, parentIndex },
      entryIndex: itemIndex,
    };
  } else {
    return {
      field: foundField,
      id: item.id ?? `${itemIndex}`,
      correspondingKeywordField,
      operator: getExceptionOperatorSelect(item),
      value: getEntryValue(item),
      nested: undefined,
      parent: undefined,
      entryIndex: itemIndex,
    };
  }
};

export const isEntryNested = (item: BuilderEntry): item is EntryNested => {
  return (item as EntryNested).entries != null;
};

/**
 * Formats the entries to be easily usable for the UI, most of the
 * complexity was introduced with nested fields
 *
 * @param patterns IIndexPattern containing available fields on rule index
 * @param entries exception item entries
 * @param addNested boolean noting whether or not UI is currently
 * set to add a nested field
 * @param parent nested entries hold copy of their parent for use in various logic
 * @param parentIndex corresponds to the entry index, this might seem obvious, but
 * was added to ensure that nested items could be identified with their parent entry
 */
export const getFormattedBuilderEntries = (
  indexPattern: IIndexPattern,
  entries: BuilderEntry[],
  parent?: EntryNested,
  parentIndex?: number
): FormattedBuilderEntry[] => {
  return entries.reduce<FormattedBuilderEntry[]>((acc, item, index) => {
    const isNewNestedEntry = item.type === 'nested' && item.entries.length === 0;
    if (item.type !== 'nested' && !isNewNestedEntry) {
      const newItemEntry: FormattedBuilderEntry = getFormattedBuilderEntry(
        indexPattern,
        item,
        index,
        parent,
        parentIndex
      );
      return [...acc, newItemEntry];
    } else {
      const parentEntry: FormattedBuilderEntry = {
        operator: isOperator,
        id: item.id ?? `${index}`,
        nested: 'parent',
        field: isNewNestedEntry
          ? undefined
          : {
              name: item.field ?? '',
              aggregatable: false,
              searchable: false,
              type: 'string',
              esTypes: ['nested'],
            },
        value: undefined,
        entryIndex: index,
        parent: undefined,
        correspondingKeywordField: undefined,
      };

      // User has selected to add a nested field, but not yet selected the field
      if (isNewNestedEntry) {
        return [...acc, parentEntry];
      }

      if (isEntryNested(item)) {
        const nestedItems = getFormattedBuilderEntries(indexPattern, item.entries, item, index);

        return [...acc, parentEntry, ...nestedItems];
      }

      return [...acc];
    }
  }, []);
};

/**
 * Determines whether an entire entry, exception item, or entry within a nested
 * entry needs to be removed
 *
 * @param exceptionItem
 * @param entryIndex index of given entry, for nested entries, this will correspond
 * to their parent index
 * @param nestedEntryIndex index of nested entry
 *
 */
export const getUpdatedEntriesOnDelete = (
  exceptionItem: ExceptionsBuilderExceptionItem,
  entryIndex: number,
  nestedParentIndex: number | null
): ExceptionsBuilderExceptionItem => {
  const itemOfInterest: BuilderEntry = exceptionItem.entries[nestedParentIndex ?? entryIndex];

  if (nestedParentIndex != null && itemOfInterest.type === OperatorTypeEnum.NESTED) {
    const updatedEntryEntries = [
      ...itemOfInterest.entries.slice(0, entryIndex),
      ...itemOfInterest.entries.slice(entryIndex + 1),
    ];

    if (updatedEntryEntries.length === 0) {
      return {
        ...exceptionItem,
        entries: [
          ...exceptionItem.entries.slice(0, nestedParentIndex),
          ...exceptionItem.entries.slice(nestedParentIndex + 1),
        ],
      };
    } else {
      const { field } = itemOfInterest;
      const updatedItemOfInterest: EntryNested | EmptyNestedEntry = {
        field,
        id: itemOfInterest.id ?? `${entryIndex}`,
        type: OperatorTypeEnum.NESTED,
        entries: updatedEntryEntries,
      };

      return {
        ...exceptionItem,
        entries: [
          ...exceptionItem.entries.slice(0, nestedParentIndex),
          updatedItemOfInterest,
          ...exceptionItem.entries.slice(nestedParentIndex + 1),
        ],
      };
    }
  } else {
    return {
      ...exceptionItem,
      entries: [
        ...exceptionItem.entries.slice(0, entryIndex),
        ...exceptionItem.entries.slice(entryIndex + 1),
      ],
    };
  }
};

export const getDefaultEmptyEntry = (): EmptyEntry => ({
  id: uuid.v4(),
  field: '',
  type: OperatorTypeEnum.MATCH,
  operator: OperatorEnum.INCLUDED,
  value: '',
});

export const getDefaultNestedEmptyEntry = (): EmptyNestedEntry => ({
  id: uuid.v4(),
  field: '',
  type: OperatorTypeEnum.NESTED,
  entries: [],
});

export const containsValueListEntry = (items: ExceptionsBuilderExceptionItem[]): boolean =>
  items.some((item) => item.entries.some((entry) => entry.type === OperatorTypeEnum.LIST));
