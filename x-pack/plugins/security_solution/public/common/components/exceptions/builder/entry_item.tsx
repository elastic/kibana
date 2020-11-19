/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { isEqlRule } from '../../../../../common/detection_engine/utils';
import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { FieldComponent } from '../../autocomplete/field';
import { OperatorComponent } from '../../autocomplete/operator';
import { OperatorOption } from '../../autocomplete/types';
import { AutocompleteFieldMatchComponent } from '../../autocomplete/field_value_match';
import { AutocompleteFieldMatchAnyComponent } from '../../autocomplete/field_value_match_any';
import { AutocompleteFieldExistsComponent } from '../../autocomplete/field_value_exists';
import { FormattedBuilderEntry, BuilderEntry } from '../types';
import { AutocompleteFieldListsComponent } from '../../autocomplete/field_value_lists';
import { ListSchema, OperatorTypeEnum, ExceptionListType } from '../../../../lists_plugin_deps';
import { getEmptyValue } from '../../empty_value';
import * as i18n from './translations';
import {
  getFilteredIndexPatterns,
  getOperatorOptions,
  getEntryOnFieldChange,
  getEntryOnOperatorChange,
  getEntryOnMatchChange,
  getEntryOnMatchAnyChange,
  getEntryOnListChange,
} from './helpers';
import { EXCEPTION_OPERATORS_ONLY_LISTS } from '../../autocomplete/operators';

const MyValuesInput = styled(EuiFlexItem)`
  overflow: hidden;
`;

interface EntryItemProps {
  entry: FormattedBuilderEntry;
  indexPattern: IIndexPattern;
  showLabel: boolean;
  listType: ExceptionListType;
  onChange: (arg: BuilderEntry, i: number) => void;
  setErrorsExist: (arg: boolean) => void;
  onlyShowListOperators?: boolean;
  ruleType?: Type;
}

export const BuilderEntryItem: React.FC<EntryItemProps> = ({
  entry,
  indexPattern,
  listType,
  showLabel,
  onChange,
  setErrorsExist,
  onlyShowListOperators = false,
  ruleType,
}): JSX.Element => {
  const handleError = useCallback(
    (err: boolean): void => {
      setErrorsExist(err);
    },
    [setErrorsExist]
  );

  const handleFieldChange = useCallback(
    ([newField]: IFieldType[]): void => {
      const { updatedEntry, index } = getEntryOnFieldChange(entry, newField);
      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleOperatorChange = useCallback(
    ([newOperator]: OperatorOption[]): void => {
      const { updatedEntry, index } = getEntryOnOperatorChange(entry, newOperator);

      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleFieldMatchValueChange = useCallback(
    (newField: string): void => {
      const { updatedEntry, index } = getEntryOnMatchChange(entry, newField);

      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleFieldMatchAnyValueChange = useCallback(
    (newField: string[]): void => {
      const { updatedEntry, index } = getEntryOnMatchAnyChange(entry, newField);

      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleFieldListValueChange = useCallback(
    (newField: ListSchema): void => {
      const { updatedEntry, index } = getEntryOnListChange(entry, newField);

      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const renderFieldInput = useCallback(
    (isFirst: boolean): JSX.Element => {
      const filteredIndexPatterns = getFilteredIndexPatterns(indexPattern, entry, listType);
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
          fieldInputWidth={275}
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
    [handleFieldChange, indexPattern, entry, listType]
  );

  const renderOperatorInput = (isFirst: boolean): JSX.Element => {
    const operatorOptions = onlyShowListOperators
      ? EXCEPTION_OPERATORS_ONLY_LISTS
      : getOperatorOptions(
          entry,
          listType,
          entry.field != null && entry.field.type === 'boolean',
          isFirst && !isEqlRule(ruleType)
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

  const getFieldValueComboBox = (type: OperatorTypeEnum, isFirst: boolean): JSX.Element => {
    switch (type) {
      case OperatorTypeEnum.MATCH:
        const value = typeof entry.value === 'string' ? entry.value : undefined;
        return (
          <AutocompleteFieldMatchComponent
            rowLabel={isFirst ? i18n.VALUE : undefined}
            placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
            selectedField={entry.correspondingKeywordField ?? entry.field}
            selectedValue={value}
            isDisabled={
              indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
            }
            isLoading={false}
            isClearable={false}
            indexPattern={indexPattern}
            onError={handleError}
            onChange={handleFieldMatchValueChange}
            isRequired
            data-test-subj="exceptionBuilderEntryFieldMatch"
          />
        );
      case OperatorTypeEnum.MATCH_ANY:
        const values: string[] = Array.isArray(entry.value) ? entry.value : [];
        return (
          <AutocompleteFieldMatchAnyComponent
            rowLabel={isFirst ? i18n.VALUE : undefined}
            placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
            selectedField={
              entry.correspondingKeywordField != null
                ? entry.correspondingKeywordField
                : entry.field
            }
            selectedValue={values}
            isDisabled={
              indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
            }
            isLoading={false}
            isClearable={false}
            indexPattern={indexPattern}
            onError={handleError}
            onChange={handleFieldMatchAnyValueChange}
            isRequired
            data-test-subj="exceptionBuilderEntryFieldMatchAny"
          />
        );
      case OperatorTypeEnum.LIST:
        const id = typeof entry.value === 'string' ? entry.value : undefined;
        return (
          <AutocompleteFieldListsComponent
            rowLabel={isFirst ? i18n.VALUE : undefined}
            selectedField={entry.field}
            placeholder={i18n.EXCEPTION_FIELD_LISTS_PLACEHOLDER}
            selectedValue={id}
            isLoading={false}
            isDisabled={
              indexPattern == null || (indexPattern != null && indexPattern.fields.length === 0)
            }
            isClearable={false}
            onChange={handleFieldListValueChange}
            isRequired
            data-test-subj="exceptionBuilderEntryFieldList"
          />
        );
      case OperatorTypeEnum.EXISTS:
        return (
          <AutocompleteFieldExistsComponent
            rowLabel={isFirst ? i18n.VALUE : undefined}
            placeholder={getEmptyValue()}
            data-test-subj="exceptionBuilderEntryFieldExists"
          />
        );
      default:
        return <></>;
    }
  };

  const renderFieldValueInput = (isFirst: boolean, entryType: OperatorTypeEnum): JSX.Element =>
    getFieldValueComboBox(entryType, isFirst);

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="flexStart"
      className="exceptionItemEntryContainer"
      data-test-subj="exceptionItemEntryContainer"
    >
      <EuiFlexItem grow={false}>{renderFieldInput(showLabel)}</EuiFlexItem>
      <EuiFlexItem grow={false}>{renderOperatorInput(showLabel)}</EuiFlexItem>
      <MyValuesInput grow={6}>
        {renderFieldValueInput(
          showLabel,
          entry.nested === 'parent' ? OperatorTypeEnum.EXISTS : entry.operator.type
        )}
      </MyValuesInput>
    </EuiFlexGroup>
  );
};

BuilderEntryItem.displayName = 'BuilderEntryItem';
