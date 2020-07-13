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
import { ListSchema, OperatorTypeEnum } from '../../../../lists_plugin_deps';
import { getValueFromOperator } from '../helpers';
import { getEmptyValue } from '../../empty_value';
import * as i18n from '../translations';

interface EntryItemProps {
  entry: FormattedBuilderEntry;
  entryIndex: number;
  indexPattern: IIndexPattern;
  isLoading: boolean;
  showLabel: boolean;
  onChange: (arg: BuilderEntry, i: number) => void;
}

export const EntryItemComponent: React.FC<EntryItemProps> = ({
  entry,
  entryIndex,
  indexPattern,
  isLoading,
  showLabel,
  onChange,
}): JSX.Element => {
  const handleFieldChange = useCallback(
    ([newField]: IFieldType[]): void => {
      onChange(
        {
          field: newField.name,
          type: OperatorTypeEnum.MATCH,
          operator: isOperator.operator,
          value: undefined,
        },
        entryIndex
      );
    },
    [onChange, entryIndex]
  );

  const handleOperatorChange = useCallback(
    ([newOperator]: OperatorOption[]): void => {
      const newEntry = getValueFromOperator(entry.field, newOperator);
      onChange(newEntry, entryIndex);
    },
    [onChange, entryIndex, entry.field]
  );

  const handleFieldMatchValueChange = useCallback(
    (newField: string): void => {
      onChange(
        {
          field: entry.field != null ? entry.field.name : undefined,
          type: OperatorTypeEnum.MATCH,
          operator: entry.operator.operator,
          value: newField,
        },
        entryIndex
      );
    },
    [onChange, entryIndex, entry.field, entry.operator.operator]
  );

  const handleFieldMatchAnyValueChange = useCallback(
    (newField: string[]): void => {
      onChange(
        {
          field: entry.field != null ? entry.field.name : undefined,
          type: OperatorTypeEnum.MATCH_ANY,
          operator: entry.operator.operator,
          value: newField,
        },
        entryIndex
      );
    },
    [onChange, entryIndex, entry.field, entry.operator.operator]
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
        entryIndex
      );
    },
    [onChange, entryIndex, entry.field, entry.operator.operator]
  );

  const renderFieldInput = (isFirst: boolean): JSX.Element => {
    const comboBox = (
      <FieldComponent
        placeholder={i18n.EXCEPTION_FIELD_PLACEHOLDER}
        indexPattern={indexPattern}
        selectedField={entry.field}
        isLoading={isLoading}
        isClearable={false}
        isDisabled={isLoading}
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
  };

  const renderOperatorInput = (isFirst: boolean): JSX.Element => {
    const comboBox = (
      <OperatorComponent
        placeholder={i18n.EXCEPTION_OPERATOR_PLACEHOLDER}
        selectedField={entry.field}
        operator={entry.operator}
        isDisabled={isLoading}
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
            isDisabled={isLoading}
            isLoading={isLoading}
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
            isDisabled={isLoading}
            isLoading={isLoading}
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
            isLoading={isLoading}
            isDisabled={isLoading}
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
      <EuiFlexItem grow={6}>{renderFieldValueInput(showLabel, entry.operator.type)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

EntryItemComponent.displayName = 'EntryItem';
