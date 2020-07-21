/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { FieldComponent } from '../../autocomplete/field';
import { OperatorComponent } from '../../autocomplete/operator';
import { isOperator } from '../../autocomplete/operators';
import { OperatorOption } from '../../autocomplete/types';
import { AutocompleteFieldMatchComponent } from '../../autocomplete/field_value_match';
import { AutocompleteFieldMatchAnyComponent } from '../../autocomplete/field_value_match_any';
import { AutocompleteFieldExistsComponent } from '../../autocomplete/field_value_exists';
import { FormattedBuilderEntry, BuilderEntry } from '../types';
import { AutocompleteFieldListsComponent } from '../../autocomplete/field_value_lists';
import {
  ListSchema,
  OperatorTypeEnum,
  ExceptionListType,
  entriesList,
} from '../../../../lists_plugin_deps';
import { getEmptyValue } from '../../empty_value';
import * as i18n from './translations';
import { getValueFromOperator, getFilteredIndexPatterns, getOperatorOptions } from './helpers';

interface EntryItemProps {
  entry: FormattedBuilderEntry;
  indexPattern: IIndexPattern;
  showLabel: boolean;
  listType: ExceptionListType;
  addNested: boolean;
  onChange: (arg: BuilderEntry, i: number) => void;
}

export const EntryItemComponent: React.FC<EntryItemProps> = ({
  entry,
  indexPattern,
  listType,
  addNested,
  showLabel,
  onChange,
}): JSX.Element => {
  const handleFieldChange = useCallback(
    ([newField]: IFieldType[]): void => {
      if (entry.nested === 'parent') {
        onChange(
          {
            field:
              newField.subType != null && newField.subType.nested != null
                ? newField.subType.nested.path
                : '',
            type: OperatorTypeEnum.NESTED,
            entries: [
              {
                field: newField.name.split('.').slice(-1)[0],
                type: OperatorTypeEnum.MATCH,
                operator: isOperator.operator,
                value: '',
              },
            ],
          },
          entry.entryIndex
        );
      } else if (entry.nested === 'child' && entry.parent != null) {
        onChange(
          {
            ...entry.parent.parent,
            entries: [
              ...entry.parent.parent.entries.slice(0, entry.entryIndex),
              {
                field: newField.name.split('.').slice(-1)[0] ?? '',
                type: OperatorTypeEnum.MATCH,
                operator: isOperator.operator,
                value: '',
              },
              ...entry.parent.parent.entries.slice(entry.entryIndex + 1),
            ],
          },
          entry.parent.parentIndex
        );
      } else {
        onChange(
          {
            field: newField != null ? newField.name : undefined,
            type: OperatorTypeEnum.MATCH,
            operator: isOperator.operator,
            value: undefined,
          },
          entry.entryIndex
        );
      }
    },
    [onChange, entry.nested, entry.parent, entry.entryIndex]
  );

  const handleOperatorChange = useCallback(
    ([newOperator]: OperatorOption[]): void => {
      const newEntry = getValueFromOperator(newOperator, entry);
      if (!entriesList.is(newEntry) && entry.nested != null && entry.parent != null) {
        onChange(
          {
            ...entry.parent.parent,
            entries: [
              ...entry.parent.parent.entries.slice(0, entry.entryIndex),
              {
                ...newEntry,
                field: entry.field != null ? entry.field.name.split('.').slice(-1)[0] : '',
              },
              ...entry.parent.parent.entries.slice(entry.entryIndex + 1),
            ],
          },
          entry.parent.parentIndex
        );
      } else {
        onChange(newEntry, entry.entryIndex);
      }
    },
    [onChange, entry]
  );

  const handleFieldMatchValueChange = useCallback(
    (newField: string): void => {
      if (entry.nested != null && entry.parent != null) {
        onChange(
          {
            ...entry.parent.parent,
            entries: [
              ...entry.parent.parent.entries.slice(0, entry.entryIndex),
              {
                field: entry.field != null ? entry.field.name.split('.').slice(-1)[0] : '',
                type: OperatorTypeEnum.MATCH,
                operator: entry.operator.operator,
                value: newField,
              },
              ...entry.parent.parent.entries.slice(entry.entryIndex + 1),
            ],
          },
          entry.parent.parentIndex
        );
      } else {
        onChange(
          {
            field: entry.field != null ? entry.field.name : undefined,
            type: OperatorTypeEnum.MATCH,
            operator: entry.operator.operator,
            value: newField,
          },
          entry.entryIndex
        );
      }
    },
    [onChange, entry.field, entry.operator.operator, entry.nested, entry.parent, entry.entryIndex]
  );

  const handleFieldMatchAnyValueChange = useCallback(
    (newField: string[]): void => {
      if (entry.nested != null && entry.parent != null) {
        onChange(
          {
            ...entry.parent.parent,
            entries: [
              ...entry.parent.parent.entries.slice(0, entry.entryIndex),
              {
                field: entry.field != null ? entry.field.name.split('.').slice(-1)[0] : '',
                type: OperatorTypeEnum.MATCH_ANY,
                operator: entry.operator.operator,
                value: newField,
              },
              ...entry.parent.parent.entries.slice(entry.entryIndex + 1),
            ],
          },
          entry.parent.parentIndex
        );
      } else {
        onChange(
          {
            field: entry.field != null ? entry.field.name : undefined,
            type: OperatorTypeEnum.MATCH_ANY,
            operator: entry.operator.operator,
            value: newField,
          },
          entry.entryIndex
        );
      }
    },
    [onChange, entry.entryIndex, entry.field, entry.operator.operator, entry.nested, entry.parent]
  );

  const handleFieldListValueChange = useCallback(
    (newField: ListSchema): void => {
      onChange(
        {
          field: entry.field != null ? entry.field.name : undefined,
          type: OperatorTypeEnum.LIST,
          operator: entry.operator.operator,
          list: { id: newField.id, type: newField.type },
        },
        entry.entryIndex
      );
    },
    [onChange, entry.entryIndex, entry.field, entry.operator.operator]
  );

  const renderFieldInput = useCallback(
    (isFirst: boolean): JSX.Element => {
      const filteredIndexPatterns = getFilteredIndexPatterns(indexPattern, entry, addNested);
      const comboBox = (
        <FieldComponent
          placeholder={
            entry.nested != null
              ? i18n.EXCEPTION_FIELD_NESTED_PLACEHOLDER
              : i18n.EXCEPTION_FIELD_PLACEHOLDER
          }
          indexPattern={filteredIndexPatterns}
          selectedField={entry.field}
          isClearable={false}
          isLoading={false}
          isDisabled={indexPattern == null}
          onChange={handleFieldChange}
          data-test-subj="exceptionBuilderEntryField"
        />
      );

      if (isFirst) {
        return (
          <EuiFormRow label={i18n.FIELD} data-test-subj="exceptionBuilderEntryFieldFormRow">
            {comboBox}
          </EuiFormRow>
        );
      } else {
        return comboBox;
      }
    },
    [handleFieldChange, addNested, indexPattern, entry]
  );

  const renderOperatorInput = (isFirst: boolean): JSX.Element => {
    const operatorOptions = getOperatorOptions(
      entry,
      listType,
      entry.field != null && entry.field.type === 'boolean'
    );
    const comboBox = (
      <OperatorComponent
        placeholder={i18n.EXCEPTION_OPERATOR_PLACEHOLDER}
        selectedField={entry.field}
        operator={entry.operator}
        isDisabled={
          indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
        }
        operatorOptions={operatorOptions}
        isLoading={false}
        isClearable={false}
        onChange={handleOperatorChange}
        data-test-subj="exceptionBuilderEntryOperator"
      />
    );

    if (isFirst) {
      return (
        <EuiFormRow label={i18n.OPERATOR} data-test-subj="exceptionBuilderEntryFieldFormRow">
          {comboBox}
        </EuiFormRow>
      );
    } else {
      return comboBox;
    }
  };

  const getFieldValueComboBox = (type: OperatorTypeEnum): JSX.Element => {
    switch (type) {
      case OperatorTypeEnum.MATCH:
        const value = typeof entry.value === 'string' ? entry.value : undefined;
        return (
          <AutocompleteFieldMatchComponent
            placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
            selectedField={entry.field}
            selectedValue={value}
            isDisabled={
              indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
            }
            isLoading={false}
            isClearable={false}
            indexPattern={indexPattern}
            onChange={handleFieldMatchValueChange}
            data-test-subj="exceptionBuilderEntryFieldMatch"
          />
        );
      case OperatorTypeEnum.MATCH_ANY:
        const values: string[] = Array.isArray(entry.value) ? entry.value : [];
        return (
          <AutocompleteFieldMatchAnyComponent
            placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
            selectedField={entry.field}
            selectedValue={values}
            isDisabled={
              indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
            }
            isLoading={false}
            isClearable={false}
            indexPattern={indexPattern}
            onChange={handleFieldMatchAnyValueChange}
            data-test-subj="exceptionBuilderEntryFieldMatchAny"
          />
        );
      case OperatorTypeEnum.LIST:
        const id = typeof entry.value === 'string' ? entry.value : undefined;
        return (
          <AutocompleteFieldListsComponent
            selectedField={entry.field}
            placeholder={i18n.EXCEPTION_FIELD_LISTS_PLACEHOLDER}
            selectedValue={id}
            isLoading={false}
            isDisabled={
              indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
            }
            isClearable={false}
            onChange={handleFieldListValueChange}
            data-test-subj="exceptionBuilderEntryFieldList"
          />
        );
      case OperatorTypeEnum.EXISTS:
        return (
          <AutocompleteFieldExistsComponent
            placeholder={getEmptyValue()}
            data-test-subj="exceptionBuilderEntryFieldExists"
          />
        );
      default:
        return <></>;
    }
  };

  const renderFieldValueInput = (isFirst: boolean, entryType: OperatorTypeEnum): JSX.Element => {
    if (isFirst) {
      return (
        <EuiFormRow label={i18n.VALUE} fullWidth data-test-subj="exceptionBuilderEntryFieldFormRow">
          {getFieldValueComboBox(entryType)}
        </EuiFormRow>
      );
    } else {
      return getFieldValueComboBox(entryType);
    }
  };

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="center"
      className="exceptionItemEntryContainer"
      data-test-subj="exceptionItemEntryContainer"
    >
      <EuiFlexItem grow={false}>{renderFieldInput(showLabel)}</EuiFlexItem>
      <EuiFlexItem grow={false}>{renderOperatorInput(showLabel)}</EuiFlexItem>
      <EuiFlexItem grow={6}>
        {renderFieldValueInput(
          showLabel,
          entry.nested === 'parent' ? OperatorTypeEnum.EXISTS : entry.operator.type
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

EntryItemComponent.displayName = 'EntryItem';
