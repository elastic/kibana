/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IFieldType, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { addIdToItem } from '../../../../common/shared_imports';
import {
  Entry,
  ExceptionListType,
  ListSchema,
  OperatorTypeEnum,
  entriesList,
} from '../../../../common';
import {
  EXCEPTION_OPERATORS,
  EXCEPTION_OPERATORS_SANS_LISTS,
  doesNotExistOperator,
  existsOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
} from '../autocomplete/operators';
import { OperatorOption } from '../autocomplete/types';

import { BuilderEntry, FormattedBuilderEntry } from './types';

/**
 * Returns filtered index patterns based on the field - if a user selects to
 * add nested entry, should only show nested fields, if item is the parent
 * field of a nested entry, we only display the parent field
 *
 * @param patterns IIndexPattern containing available fields on rule index
 * @param item exception item entry
 * set to add a nested field
 */
export const getFilteredIndexPatterns = (
  patterns: IIndexPattern,
  item: FormattedBuilderEntry,
  type: ExceptionListType,
  preFilter?: (i: IIndexPattern, t: ExceptionListType) => IIndexPattern
): IIndexPattern => {
  const indexPatterns = preFilter != null ? preFilter(patterns, type) : patterns;

  if (item.nested === 'child' && item.parent != null) {
    // when user has selected a nested entry, only fields with the common parent are shown
    return {
      ...indexPatterns,
      fields: indexPatterns.fields
        .filter((indexField) => {
          const fieldHasCommonParentPath =
            indexField.subType != null &&
            indexField.subType.nested != null &&
            item.parent != null &&
            indexField.subType.nested.path === item.parent.parent.field;

          return fieldHasCommonParentPath;
        })
        .map((f) => {
          const [fieldNameWithoutParentPath] = f.name.split('.').slice(-1);
          return { ...f, name: fieldNameWithoutParentPath };
        }),
    };
  } else if (item.nested === 'parent' && item.field != null) {
    // when user has selected a nested entry, right above it we show the common parent
    return { ...indexPatterns, fields: [item.field] };
  } else if (item.nested === 'parent' && item.field == null) {
    // when user selects to add a nested entry, only nested fields are shown as options
    return {
      ...indexPatterns,
      fields: indexPatterns.fields.filter(
        (field) => field.subType != null && field.subType.nested != null
      ),
    };
  } else {
    return indexPatterns;
  }
};

/**
 * Determines proper entry update when user selects new field
 *
 * @param item - current exception item entry values
 * @param newField - newly selected field
 *
 */
export const getEntryOnFieldChange = (
  item: FormattedBuilderEntry,
  newField: IFieldType
): { index: number; updatedEntry: BuilderEntry } => {
  const { parent, entryIndex, nested } = item;
  const newChildFieldValue = newField != null ? newField.name.split('.').slice(-1)[0] : '';

  if (nested === 'parent') {
    // For nested entries, when user first selects to add a nested
    // entry, they first see a row similar to what is shown for when
    // a user selects "exists", as soon as they make a selection
    // we can now identify the 'parent' and 'child' this is where
    // we first convert the entry into type "nested"
    const newParentFieldValue =
      newField.subType != null && newField.subType.nested != null
        ? newField.subType.nested.path
        : '';

    return {
      index: entryIndex,
      updatedEntry: {
        entries: [
          addIdToItem({
            field: newChildFieldValue ?? '',
            operator: isOperator.operator,
            type: OperatorTypeEnum.MATCH,
            value: '',
          }),
        ],
        field: newParentFieldValue,
        id: item.id,
        type: OperatorTypeEnum.NESTED,
      },
    };
  } else if (nested === 'child' && parent != null) {
    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: newChildFieldValue ?? '',
            id: item.id,
            operator: isOperator.operator,
            type: OperatorTypeEnum.MATCH,
            value: '',
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: newField != null ? newField.name : '',
        id: item.id,
        operator: isOperator.operator,
        type: OperatorTypeEnum.MATCH,
        value: '',
      },
    };
  }
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "list"
 *
 * @param item - current exception item entry values
 * @param newField - newly selected list
 *
 */
export const getEntryOnListChange = (
  item: FormattedBuilderEntry,
  newField: ListSchema
): { index: number; updatedEntry: BuilderEntry } => {
  const { entryIndex, field, operator } = item;
  const { id, type } = newField;

  return {
    index: entryIndex,
    updatedEntry: {
      field: field != null ? field.name : '',
      id: item.id,
      list: { id, type },
      operator: operator.operator,
      type: OperatorTypeEnum.LIST,
    },
  };
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "match_any"
 *
 * @param item - current exception item entry values
 * @param newField - newly entered value
 *
 */
export const getEntryOnMatchAnyChange = (
  item: FormattedBuilderEntry,
  newField: string[]
): { index: number; updatedEntry: BuilderEntry } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            id: item.id,
            operator: operator.operator,
            type: OperatorTypeEnum.MATCH_ANY,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: field != null ? field.name : '',
        id: item.id,
        operator: operator.operator,
        type: OperatorTypeEnum.MATCH_ANY,
        value: newField,
      },
    };
  }
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "match"
 *
 * @param item - current exception item entry values
 * @param newField - newly entered value
 *
 */
export const getEntryOnMatchChange = (
  item: FormattedBuilderEntry,
  newField: string
): { index: number; updatedEntry: BuilderEntry } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            id: item.id,
            operator: operator.operator,
            type: OperatorTypeEnum.MATCH,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: field != null ? field.name : '',
        id: item.id,
        operator: operator.operator,
        type: OperatorTypeEnum.MATCH,
        value: newField,
      },
    };
  }
};

/**
 * On operator change, determines whether value needs to be cleared or not
 *
 * @param field
 * @param selectedOperator
 * @param currentEntry
 *
 */
export const getEntryFromOperator = (
  selectedOperator: OperatorOption,
  currentEntry: FormattedBuilderEntry
): Entry & { id?: string } => {
  const isSameOperatorType = currentEntry.operator.type === selectedOperator.type;
  const fieldValue = currentEntry.field != null ? currentEntry.field.name : '';
  switch (selectedOperator.type) {
    case 'match':
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.MATCH,
        value:
          isSameOperatorType && typeof currentEntry.value === 'string' ? currentEntry.value : '',
      };
    case 'match_any':
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.MATCH_ANY,
        value: isSameOperatorType && Array.isArray(currentEntry.value) ? currentEntry.value : [],
      };
    case 'list':
      return {
        field: fieldValue,
        id: currentEntry.id,
        list: { id: '', type: 'ip' },
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.LIST,
      };
    default:
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.EXISTS,
      };
  }
};

/**
 * Determines proper entry update when user selects new operator
 *
 * @param item - current exception item entry values
 * @param newOperator - newly selected operator
 *
 */
export const getEntryOnOperatorChange = (
  item: FormattedBuilderEntry,
  newOperator: OperatorOption
): { updatedEntry: BuilderEntry; index: number } => {
  const { parent, entryIndex, field, nested } = item;
  const newEntry = getEntryFromOperator(newOperator, item);

  if (!entriesList.is(newEntry) && nested != null && parent != null) {
    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            ...newEntry,
            field: field != null ? field.name.split('.').slice(-1)[0] : '',
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return { index: entryIndex, updatedEntry: newEntry };
  }
};

/**
 * Determines which operators to make available
 *
 * @param item
 * @param listType
 * @param isBoolean
 * @param includeValueListOperators whether or not to include the 'is in list' and 'is not in list' operators
 */
export const getOperatorOptions = (
  item: FormattedBuilderEntry,
  listType: ExceptionListType,
  isBoolean: boolean,
  includeValueListOperators = true
): OperatorOption[] => {
  if (item.nested === 'parent' || item.field == null) {
    return [isOperator];
  } else if ((item.nested != null && listType === 'endpoint') || listType === 'endpoint') {
    return isBoolean ? [isOperator] : [isOperator, isOneOfOperator];
  } else if (item.nested != null && listType === 'detection') {
    return isBoolean ? [isOperator, existsOperator] : [isOperator, isOneOfOperator, existsOperator];
  } else {
    return isBoolean
      ? [isOperator, isNotOperator, existsOperator, doesNotExistOperator]
      : includeValueListOperators
      ? EXCEPTION_OPERATORS
      : EXCEPTION_OPERATORS_SANS_LISTS;
  }
};
