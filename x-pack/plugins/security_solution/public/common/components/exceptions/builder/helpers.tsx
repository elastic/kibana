/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern, IFieldType } from '../../../../../../../../src/plugins/data/common';
import {
  Entry,
  OperatorTypeEnum,
  EntryNested,
  ExceptionListType,
  EntryMatch,
  EntryMatchAny,
  EntryExists,
  entriesList,
  ListSchema,
  OperatorEnum,
} from '../../../../lists_plugin_deps';
import {
  isOperator,
  existsOperator,
  isOneOfOperator,
  EXCEPTION_OPERATORS,
  EXCEPTION_OPERATORS_SANS_LISTS,
  isNotOperator,
  doesNotExistOperator,
} from '../../autocomplete/operators';
import { OperatorOption } from '../../autocomplete/types';
import {
  BuilderEntry,
  FormattedBuilderEntry,
  ExceptionsBuilderExceptionItem,
  EmptyEntry,
  EmptyNestedEntry,
} from '../types';
import { getEntryValue, getExceptionOperatorSelect } from '../helpers';
import exceptionableFields from '../exceptionable_fields.json';

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
  type: ExceptionListType
): IIndexPattern => {
  const indexPatterns = {
    ...patterns,
    fields: patterns.fields.filter(({ name }) =>
      type === 'endpoint' ? exceptionableFields.includes(name) : true
    ),
  };

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
          const fieldNameWithoutParentPath = f.name.split('.').slice(-1)[0];
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
      operator: getExceptionOperatorSelect(item),
      value: getEntryValue(item),
      nested: 'child',
      parent: { parent, parentIndex },
      entryIndex: itemIndex,
    };
  } else {
    return {
      field: foundField,
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
    const updatedEntryEntries: Array<EmptyEntry | EntryMatch | EntryMatchAny | EntryExists> = [
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
): Entry => {
  const isSameOperatorType = currentEntry.operator.type === selectedOperator.type;
  const fieldValue = currentEntry.field != null ? currentEntry.field.name : '';
  switch (selectedOperator.type) {
    case 'match':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH,
        operator: selectedOperator.operator,
        value:
          isSameOperatorType && typeof currentEntry.value === 'string' ? currentEntry.value : '',
      };
    case 'match_any':
      return {
        field: fieldValue,
        type: OperatorTypeEnum.MATCH_ANY,
        operator: selectedOperator.operator,
        value: isSameOperatorType && Array.isArray(currentEntry.value) ? currentEntry.value : [],
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
): { updatedEntry: BuilderEntry; index: number } => {
  const { parent, entryIndex, nested } = item;
  const newChildFieldValue = newField != null ? newField.name.split('.').slice(-1)[0] : '';

  if (nested === 'parent') {
    // For nested entries, when user first selects to add a nested
    // entry, they first see a row similiar to what is shown for when
    // a user selects "exists", as soon as they make a selection
    // we can now identify the 'parent' and 'child' this is where
    // we first convert the entry into type "nested"
    const newParentFieldValue =
      newField.subType != null && newField.subType.nested != null
        ? newField.subType.nested.path
        : '';

    return {
      updatedEntry: {
        field: newParentFieldValue,
        type: OperatorTypeEnum.NESTED,
        entries: [
          {
            field: newChildFieldValue ?? '',
            type: OperatorTypeEnum.MATCH,
            operator: isOperator.operator,
            value: '',
          },
        ],
      },
      index: entryIndex,
    };
  } else if (nested === 'child' && parent != null) {
    return {
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: newChildFieldValue ?? '',
            type: OperatorTypeEnum.MATCH,
            operator: isOperator.operator,
            value: '',
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
      index: parent.parentIndex,
    };
  } else {
    return {
      updatedEntry: {
        field: newField != null ? newField.name : '',
        type: OperatorTypeEnum.MATCH,
        operator: isOperator.operator,
        value: '',
      },
      index: entryIndex,
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
      index: parent.parentIndex,
    };
  } else {
    return { updatedEntry: newEntry, index: entryIndex };
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
): { updatedEntry: BuilderEntry; index: number } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            type: OperatorTypeEnum.MATCH,
            operator: operator.operator,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
      index: parent.parentIndex,
    };
  } else {
    return {
      updatedEntry: {
        field: field != null ? field.name : '',
        type: OperatorTypeEnum.MATCH,
        operator: operator.operator,
        value: newField,
      },
      index: entryIndex,
    };
  }
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
): { updatedEntry: BuilderEntry; index: number } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            type: OperatorTypeEnum.MATCH_ANY,
            operator: operator.operator,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
      index: parent.parentIndex,
    };
  } else {
    return {
      updatedEntry: {
        field: field != null ? field.name : '',
        type: OperatorTypeEnum.MATCH_ANY,
        operator: operator.operator,
        value: newField,
      },
      index: entryIndex,
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
): { updatedEntry: BuilderEntry; index: number } => {
  const { entryIndex, field, operator } = item;
  const { id, type } = newField;

  return {
    updatedEntry: {
      field: field != null ? field.name : '',
      type: OperatorTypeEnum.LIST,
      operator: operator.operator,
      list: { id, type },
    },
    index: entryIndex,
  };
};

export const getDefaultEmptyEntry = (): EmptyEntry => ({
  field: '',
  type: OperatorTypeEnum.MATCH,
  operator: OperatorEnum.INCLUDED,
  value: '',
});

export const getDefaultNestedEmptyEntry = (): EmptyNestedEntry => ({
  field: '',
  type: OperatorTypeEnum.NESTED,
  entries: [],
});

export const containsValueListEntry = (items: ExceptionsBuilderExceptionItem[]): boolean =>
  items.some((item) => item.entries.some((entry) => entry.type === OperatorTypeEnum.LIST));
