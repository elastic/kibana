/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useCallback, useState } from 'react';
import { EuiFormRow, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { FieldComponent } from '../../autocomplete/field';
import * as i18n from '../translations';
import { OperatorComponent } from '../../autocomplete/operator';
import { isOperator } from '../../autocomplete/operators';
import { OperatorOption, OperatorType } from '../../autocomplete/types';
import { AutocompleteFieldMatchComponent } from '../../autocomplete/field_value_match';
import { AutocompleteFieldMatchAnyComponent } from '../../autocomplete/field_value_match_any';
import { AutocompleteFieldExistsComponent } from '../../autocomplete/field_value_exists';
import { FormattedBuilderEntry } from '../types';

interface EntryItemProps {
  entry: FormattedBuilderEntry;
  entryIndex: number;
  indexPattern: IIndexPattern;
  isLoading: boolean;
  showLabel: boolean;
  onDeleteEntry: (i: number) => void;
  onChange: (arg: Entry, i: number) => void;
}

export const EntryItemComponent: React.FC<EntryItemProps> = ({
  entry,
  entryIndex,
  indexPattern,
  isLoading,
  showLabel,
  onDeleteEntry,
  onChange,
}): JSX.Element => {
  const [selectedField, setSelectedField] = useState<IFieldType | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<OperatorOption>(isOperator);
  const [selectedValue, setSelectedValue] = useState<string | string[] | undefined>('');

  useEffect(() => {
    setSelectedField(entry.field);
    setSelectedOperator(entry.operator);
    setSelectedValue(entry.value);
  }, [entry.field, entry.operator, entry.value]);

  const handleFieldChange = useCallback(
    ([newField]: IFieldType[]) => {
      onChange(
        { field: newField.name, type: isOperator.type, operator: isOperator.operator, value: '' },
        entryIndex
      );
    },
    [onChange, entryIndex]
  );

  const handleOperatorChange = useCallback(
    ([newOperator]: OperatorOption[]) => {
      onChange(
        {
          field: selectedField != null ? selectedField.name : '',
          type: newOperator.type,
          operator: newOperator.operator,
          value: '',
        },
        entryIndex
      );
    },
    [onChange, selectedField, entryIndex]
  );

  const handleFieldMatchValueChange = useCallback(
    (newField: string) => {
      onChange(
        {
          field: selectedField != null ? selectedField.name : '',
          type: selectedOperator.type,
          operator: selectedOperator.operator,
          value: newField,
        },
        entryIndex
      );
    },
    [onChange, selectedField, selectedOperator, entryIndex]
  );

  const handleFieldMatchAnyValueChange = useCallback(
    (newField: string[]) => {
      onChange(
        {
          field: selectedField != null ? selectedField.name : '',
          type: selectedOperator.type,
          operator: selectedOperator.operator,
          value: newField,
        },
        entryIndex
      );
    },
    [onChange, selectedField, selectedOperator, entryIndex]
  );

  const renderFieldInput = (isFirst: boolean): JSX.Element => {
    const comboBox = (
      <FieldComponent
        placeholder={i18n.EXCEPTION_FIELD_PLACEHOLDER}
        indexPattern={indexPattern}
        selectedField={selectedField}
        isLoading={isLoading}
        isClearable={false}
        onChange={handleFieldChange}
        data-test-subj="filterFieldSuggestionList"
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
        field={selectedField}
        operator={selectedOperator}
        isDisabled={false}
        isLoading={false}
        isClearable={false}
        onChange={handleOperatorChange}
        data-test-subj="filterFieldSuggestionList"
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

  const renderFieldValueInput = (isFirst: boolean, entryType: OperatorType): JSX.Element => {
    const getComboBox = (type: OperatorType) => {
      switch (type) {
        case 'match':
          const value: string = typeof selectedValue === 'string' ? selectedValue : '';
          return (
            <AutocompleteFieldMatchComponent
              placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
              field={selectedField}
              operator={selectedOperator}
              selectedValue={value}
              isDisabled={false}
              isLoading={isLoading}
              isClearable={false}
              indexPattern={indexPattern}
              onChange={handleFieldMatchValueChange}
              data-test-subj="filterFieldSuggestionList"
            />
          );
        case 'match_any':
          const values: string[] = Array.isArray(selectedValue) ? selectedValue : [];
          return (
            <AutocompleteFieldMatchAnyComponent
              placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
              field={selectedField}
              operator={selectedOperator}
              selectedValue={values}
              isDisabled={false}
              isLoading={isLoading}
              isClearable={false}
              indexPattern={indexPattern}
              onChange={handleFieldMatchAnyValueChange}
              data-test-subj="filterFieldSuggestionList"
            />
          );
        case 'exists':
          return (
            <AutocompleteFieldExistsComponent
              placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
              data-test-subj="filterFieldSuggestionList"
            />
          );
        default:
          return <></>;
      }
    };

    if (isFirst) {
      return (
        <EuiFormRow label={i18n.VALUE} fullWidth data-test-subj="exceptionBuilderEntryFieldFormRow">
          {getComboBox(entryType)}
        </EuiFormRow>
      );
    } else {
      return getComboBox(entryType);
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
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          onClick={() => onDeleteEntry(entryIndex)}
          aria-label="entryDeleteButton"
          className="exceptionItemEntryDeleteButton"
          data-test-subj="exceptionItemEntryDeleteButton"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

EntryItemComponent.displayName = 'EntryItem';
