/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiComboBox,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiButtonIcon,
} from '@elastic/eui';

import { BrowserField, BrowserFields } from '../../../containers/source';
import { getAllCategoryFieldNames, getFields } from '../helpers';
import { EXCEPTION_OPERATORS, isOperator } from '../operators';
import { FormattedBuilderEntry, OperatorOption } from '../types';
import * as i18n from '../translations';
import { AutocompleteField } from '../../autocomplete/field';
import { useFieldValueAutocomplete } from '../../autocomplete/use_autocomplete';
import { Operator } from '../../autocomplete/operator';

const OPERATOR_SELECT_WIDTH = 150;
const FIELD_COMBO_BOX_WIDTH = 195;

interface EntryItemProps {
  entry: FormattedBuilderEntry;
  entryIndex: number;
  indexPattern: IIndexPattern;
  browserFields: BrowserFields;
  showLabel: boolean;
  isLoading: boolean;
  onEntryChange: (arg: Partial<FormattedBuilderEntry>, i: number) => void;
  onDeleteEntry: () => void;
}

export const EntryItem = React.memo<EntryItemProps>(
  ({
    entry,
    entryIndex,
    indexPattern,
    browserFields,
    showLabel,
    isLoading,
    onEntryChange,
    onDeleteEntry,
  }) => {
    const [selectedField, setSelectedField] = useState<IFieldType | null>(entry.field);
    const [selectedOperator, setSelectedOperator] = useState<OperatorOption>(entry.operator);
    const [selectedValue, setSelectedValue] = useState<string | string[]>('');
    const [isLoadingSuggestions, suggestions] = useFieldValueAutocomplete({
      field: selectedField,
      operator: selectedOperator,
      values: selectedValue,
      indexPattern,
    });

    useEffect(() => {
      setSelectedField(entry.field);
      setSelectedOperator(entry.operator);
      setSelectedValue(entry.value);
    }, [entry.field, entry.operator, entry.value]);

    const onFieldChange = (options: Array<Partial<BrowserField>>, labels: string[]) => (
      newOptions: EuiComboBoxOptionOption[]
    ) => {
      const [newValues] = newOptions.map(({ label }) => {
        return options[labels.indexOf(label)];
      });

      onEntryChange({ field: newValues, operator: isOperator, value: '' }, entryIndex);
    };

    const onOperatorChange = (options: OperatorOption[], labels: string[]) => (
      newOptions: EuiComboBoxOptionOption[]
    ) => {
      const [newValues] = newOptions.map(({ label }) => {
        return options[labels.indexOf(label)];
      });

      onEntryChange({ field: selectedField, operator: newValues, value: '' }, entryIndex);
    };

    const onValueChange = (newValues: EuiComboBoxOptionOption[]) => {
      const vals = newValues.map(({ label }) => label);

      if (selectedOperator.type === 'match') {
        onEntryChange(
          { field: selectedField, operator: selectedOperator, value: vals[0] },
          entryIndex
        );
      } else {
        onEntryChange(
          { field: selectedField, operator: selectedOperator, value: vals },
          entryIndex
        );
      }
    };

    const renderFieldInput = (isFirst: boolean): JSX.Element => {
      const options = getAllCategoryFieldNames(browserFields);
      const fieldSelected = selectedField ? [selectedField] : [];
      const { euiOptions, selectedEuiOptions, onInputChange } = getFields({
        options,
        fieldSelected,
        getLabel: ({ name }) => name,
        onChange: onFieldChange,
      });
      const comboBox = (
        <EuiComboBox
          id="fieldInput"
          placeholder={i18n.EXCEPTION_FIELD_PLACEHOLDER}
          options={euiOptions}
          selectedOptions={selectedEuiOptions}
          onChange={onInputChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          isLoading={isLoading}
          className="exceptionsEntry__fieldInput"
          data-test-subj="filterFieldSuggestionList"
          style={{ width: `${FIELD_COMBO_BOX_WIDTH}px` }}
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

    const getLabel = useCallback((option) => option, []);

    const renderOperatorInput = (isFirst: boolean): JSX.Element => {
      const comboBox = (
        <Operator
          onChange={onOperatorChange}
          isLoading={false}
          operator={selectedOperator}
          field={selectedField}
          getLabel={({ message }) => message}
          placeholder={i18n.EXCEPTION_OPERATOR_PLACEHOLDER}
          style={{ width: `${OPERATOR_SELECT_WIDTH}px` }}
        />
      );

      if (isFirst) {
        return (
          <EuiFormRow label={i18n.OPERATOR} data-test-subj="exceptionBuilderEntryOperatorFormRow">
            {comboBox}
          </EuiFormRow>
        );
      } else {
        return comboBox;
      }
    };

    const renderValueInput = (isFirst: boolean): JSX.Element => {
      const comboBox = (
        <AutocompleteField
          isLoading={isLoadingSuggestions}
          type={
            selectedOperator.type === 'match'
              ? 'phrase'
              : selectedOperator.type === 'match_any'
              ? 'phrases'
              : selectedOperator.type
          }
          suggestions={suggestions}
          value={selectedValue}
          placeholder={i18n.VALUE}
          getLabel={getLabel}
          onChange={onValueChange}
        />
      );

      if (isFirst) {
        return (
          <EuiFormRow label={i18n.OPERATOR} data-test-subj="exceptionBuilderEntryOperatorFormRow">
            {comboBox}
          </EuiFormRow>
        );
      } else {
        return comboBox;
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
        <EuiFlexItem grow={6}>{renderValueInput(showLabel)}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            onClick={onDeleteEntry}
            aria-label="entryDeleteButton"
            className="exceptionItemEntryDeleteButton"
            data-test-subj="exceptionItemEntryDeleteButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

EntryItem.displayName = 'EntryItem';
