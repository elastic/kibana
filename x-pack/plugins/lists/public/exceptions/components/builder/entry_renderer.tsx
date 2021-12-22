/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import styled from 'styled-components';
import {
  ExceptionListType,
  ListSchema,
  ListOperatorTypeEnum as OperatorTypeEnum,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  BuilderEntry,
  EXCEPTION_OPERATORS_ONLY_LISTS,
  FormattedBuilderEntry,
  OperatorOption,
  getEntryOnFieldChange,
  getEntryOnListChange,
  getEntryOnMatchAnyChange,
  getEntryOnMatchChange,
  getEntryOnOperatorChange,
  getFilteredIndexPatterns,
  getOperatorOptions,
} from '@kbn/securitysolution-list-utils';
import {
  AutocompleteFieldExistsComponent,
  AutocompleteFieldListsComponent,
  AutocompleteFieldMatchAnyComponent,
  AutocompleteFieldMatchComponent,
  FieldComponent,
  OperatorComponent,
} from '@kbn/securitysolution-autocomplete';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import type { AutocompleteStart } from '../../../../../../../src/plugins/data/public';
import { HttpStart } from '../../../../../../../src/core/public';
import { getEmptyValue } from '../../../common/empty_value';

import * as i18n from './translations';

const MyValuesInput = styled(EuiFlexItem)`
  overflow: hidden;
`;

export interface EntryItemProps {
  allowLargeValueLists?: boolean;
  autocompleteService: AutocompleteStart;
  entry: FormattedBuilderEntry;
  httpService: HttpStart;
  indexPattern: DataViewBase;
  showLabel: boolean;
  osTypes?: OsTypeArray;
  listType: ExceptionListType;
  listTypeSpecificIndexPatternFilter?: (
    pattern: DataViewBase,
    type: ExceptionListType,
    osTypes?: OsTypeArray
  ) => DataViewBase;
  onChange: (arg: BuilderEntry, i: number) => void;
  onlyShowListOperators?: boolean;
  setErrorsExist: (arg: boolean) => void;
  isDisabled?: boolean;
  operatorsList?: OperatorOption[];
}

export const BuilderEntryItem: React.FC<EntryItemProps> = ({
  allowLargeValueLists = false,
  autocompleteService,
  entry,
  httpService,
  indexPattern,
  osTypes,
  listType,
  listTypeSpecificIndexPatternFilter,
  onChange,
  onlyShowListOperators = false,
  setErrorsExist,
  showLabel,
  isDisabled = false,
  operatorsList,
}): JSX.Element => {
  const handleError = useCallback(
    (err: boolean): void => {
      setErrorsExist(err);
    },
    [setErrorsExist]
  );

  const handleFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
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

  const isFieldComponentDisabled = useMemo(
    (): boolean =>
      isDisabled ||
      indexPattern == null ||
      (indexPattern != null && indexPattern.fields.length === 0),
    [isDisabled, indexPattern]
  );

  const renderFieldInput = useCallback(
    (isFirst: boolean): JSX.Element => {
      const filteredIndexPatterns = getFilteredIndexPatterns(
        indexPattern,
        entry,
        listType,
        listTypeSpecificIndexPatternFilter,
        osTypes
      );
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
          isDisabled={isDisabled || indexPattern == null}
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
        return (
          <EuiFormRow label={''} data-test-subj="exceptionBuilderEntryFieldFormRow">
            {comboBox}
          </EuiFormRow>
        );
      }
    },
    [
      indexPattern,
      entry,
      listType,
      listTypeSpecificIndexPatternFilter,
      handleFieldChange,
      osTypes,
      isDisabled,
    ]
  );

  const renderOperatorInput = (isFirst: boolean): JSX.Element => {
    const operatorOptions = operatorsList
      ? operatorsList
      : onlyShowListOperators
      ? EXCEPTION_OPERATORS_ONLY_LISTS
      : getOperatorOptions(
          entry,
          listType,
          entry.field != null && entry.field.type === 'boolean',
          isFirst && allowLargeValueLists
        );
    const comboBox = (
      <OperatorComponent
        placeholder={i18n.EXCEPTION_OPERATOR_PLACEHOLDER}
        selectedField={entry.field}
        operator={entry.operator}
        isDisabled={isFieldComponentDisabled}
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
      return (
        <EuiFormRow label={''} data-test-subj="exceptionBuilderEntryFieldFormRow">
          {comboBox}
        </EuiFormRow>
      );
    }
  };

  const getFieldValueComboBox = (type: OperatorTypeEnum, isFirst: boolean): JSX.Element => {
    switch (type) {
      case OperatorTypeEnum.MATCH:
        const value = typeof entry.value === 'string' ? entry.value : undefined;
        return (
          <AutocompleteFieldMatchComponent
            autocompleteService={autocompleteService}
            rowLabel={isFirst ? i18n.VALUE : undefined}
            placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
            selectedField={entry.correspondingKeywordField ?? entry.field}
            selectedValue={value}
            isDisabled={isFieldComponentDisabled}
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
            autocompleteService={autocompleteService}
            rowLabel={isFirst ? i18n.VALUE : undefined}
            placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
            selectedField={
              entry.correspondingKeywordField != null
                ? entry.correspondingKeywordField
                : entry.field
            }
            selectedValue={values}
            isDisabled={isFieldComponentDisabled}
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
            httpService={httpService}
            rowLabel={isFirst ? i18n.VALUE : undefined}
            selectedField={entry.field}
            placeholder={i18n.EXCEPTION_FIELD_LISTS_PLACEHOLDER}
            selectedValue={id}
            isLoading={false}
            isDisabled={isFieldComponentDisabled}
            isClearable={false}
            onChange={handleFieldListValueChange}
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
