/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { Entry, OperatorTypeEnum, EntryNested } from '../../../../lists_plugin_deps';
import { isOperator } from '../../autocomplete/operators';
import { OperatorOption } from '../../autocomplete/types';
import { BuilderEntry, FormattedBuilderEntry, ExceptionsBuilderExceptionItem } from '../types';
import { getEntryValue, getExceptionOperatorSelect } from '../helpers';

/**
 * Returns filtered index patterns based on the field - if a user selects to
 * add nested entry, should only show nested fields, if item is the parent
 * field of a nested entry, we only display the parent field
 *
 * @param patterns IIndexPattern containing available fields on rule index
 * @param item exception item entry
 * @param addNested boolean noting whether or not UI is currently
 * set to add a nested field
 */
export const getFilteredIndexPatterns = (
  patterns: IIndexPattern,
  item: FormattedBuilderEntry,
  addNested: boolean
): IIndexPattern => {
  if (item.nested === 'child' && item.parent != null) {
    return {
      ...patterns,
      fields: patterns.fields.filter(
        (field) =>
          field.subType != null &&
          field.subType.nested != null &&
          item.parent != null &&
          field.subType.nested.path.startsWith(item.parent.parent.field)
      ),
    };
  } else if (item.nested === 'parent' && item.field != null) {
    return { ...patterns, fields: [item.field] };
  } else if (item.nested === 'parent' && addNested) {
    return {
      ...patterns,
      fields: patterns.fields.filter(
        (field) => field.subType != null && field.subType.nested != null
      ),
    };
  } else {
    return patterns;
  }
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
  const [selectedField] = fields.filter(({ name }) => field != null && field === name);

  if (parent != null && parentIndex != null) {
    return {
      field: selectedField,
      operator: isOperator,
      value: getEntryValue(item),
      nested: 'child',
      parent: { parent, parentIndex },
      entryIndex: itemIndex,
    };
  } else {
    return {
      field: selectedField,
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
  addNested: boolean,
  parent?: EntryNested,
  parentIndex?: number
): FormattedBuilderEntry[] => {
  return entries.reduce<FormattedBuilderEntry[]>((acc, item, index) => {
    const isNewNestedEntry = addNested && index === entries.length - 1 && item.type === 'match';
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
      };

      if (isNewNestedEntry) {
        return [...acc, parentEntry];
      }

      if (isEntryNested(item)) {
        const nestedItems = getFormattedBuilderEntries(
          indexPattern,
          item.entries,
          false,
          item,
          index
        );

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
  nestedEntryIndex: number | null
): ExceptionsBuilderExceptionItem => {
  const itemOfInterest = exceptionItem.entries[entryIndex];

  if (nestedEntryIndex != null && itemOfInterest.type === 'nested') {
    const updatedEntryEntries = [
      ...itemOfInterest.entries.slice(0, nestedEntryIndex),
      ...itemOfInterest.entries.slice(nestedEntryIndex + 1),
    ];

    const updatedItemOfInterest = {
      ...itemOfInterest,
      entries: updatedEntryEntries,
    };

    if (updatedEntryEntries.length === 0) {
      return {
        ...exceptionItem,
        entries: [
          ...exceptionItem.entries.slice(0, entryIndex),
          ...exceptionItem.entries.slice(entryIndex + 1),
        ],
      };
    } else {
      return {
        ...exceptionItem,
        entries: [
          ...exceptionItem.entries.slice(0, entryIndex),
          updatedItemOfInterest,
          ...exceptionItem.entries.slice(entryIndex + 1),
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

export const getValueFromOperator = (
  field: IFieldType | undefined,
  selectedOperator: OperatorOption
): Entry => {
  const fieldValue = field != null ? field.name : '';
  switch (selectedOperator.type) {
    case 'match':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH,
        operator: selectedOperator.operator,
        value: '',
      };
    case 'match_any':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH_ANY,
        operator: selectedOperator.operator,
        value: [],
      };
    case 'list':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.LIST,
        operator: selectedOperator.operator,
        list: { id: '', type: 'ip' },
      };
    default:
      return {
        field: fieldValue,
        type: OperatorTypeEnum.EXISTS,
        operator: selectedOperator.operator,
      };
  }
};
