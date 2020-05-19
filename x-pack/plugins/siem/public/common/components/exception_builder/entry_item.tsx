/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSelect,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import React, { useCallback, ChangeEvent } from 'react';
import styled from 'styled-components';

import * as i18n from './translations';
import {
  getExceptionOperatorSelect,
  getOperatorType,
  getUpdatedEntryFromOperator,
  getEntryValue,
  getAllCategoryFieldNames,
  formatFieldValues,
  getOperatorLabels,
} from './helpers';
import { Operator, ExceptionItemEntry } from './types';
import { BrowserFields } from '../../containers/source';

const FIELD_COMBO_BOX_WIDTH = 195;
const OPERATOR_SELECT_WIDTH = 135;

const EuiFormRowWrapper = styled(EuiFormRow)`
  max-width: 100%;
`;

interface EntryItemProps {
  exceptionItemEntry: ExceptionItemEntry;
  exceptionItemIndex: number;
  listType: string;
  entryIndex: number;
  isLastEntry: boolean;
  browserFields: BrowserFields;
  indexPatternLoading: boolean;
  idAria: string;
  onEntryUpdate: (item: ExceptionItemEntry, index: number) => void;
  onDeleteEntry: (index: number) => void;
}

export const EntryItem = React.memo<EntryItemProps>(
  ({
    exceptionItemEntry,
    exceptionItemIndex,
    listType,
    entryIndex,
    browserFields,
    indexPatternLoading,
    idAria,
    onEntryUpdate,
    onDeleteEntry,
  }) => {
    const onFieldChange = useCallback(
      (selectedField: EuiComboBoxOptionOption[]) => {
        const [selectedLabel] = selectedField;
        const newValue = selectedLabel ? selectedLabel.label : '';
        const updatedEntry = {
          field: newValue,
          operator: Operator.INCLUSION,
          match: '',
        };

        onEntryUpdate(updatedEntry, entryIndex);
      },
      [entryIndex]
    );

    const updateEntryOperator = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) => {
        const selectedOperator = event.target.value;
        const updatedEntry = getUpdatedEntryFromOperator({
          entry: exceptionItemEntry,
          selectedOperator,
        });

        onEntryUpdate(updatedEntry, entryIndex);
      },
      [entryIndex, exceptionItemEntry]
    );

    const updateMatchAnyEntryValue = useCallback(
      (newValue: string) => {
        const values = getEntryValue(exceptionItemEntry);
        const updatedEntry = {
          field: exceptionItemEntry.field,
          operator: exceptionItemEntry.operator,
          match_any: [...values, newValue],
        };
        onEntryUpdate(updatedEntry, entryIndex);
      },
      [entryIndex, exceptionItemEntry]
    );

    const updateMatchEntryValue = useCallback(
      (newValue: string) => {
        const updatedEntry = {
          field: exceptionItemEntry.field,
          operator: exceptionItemEntry.operator,
          match: newValue,
        };
        onEntryUpdate(updatedEntry, entryIndex);
      },
      [entryIndex, exceptionItemEntry]
    );

    const onMatchChange = useCallback(
      (values: Array<EuiComboBoxOptionOption<string>>) => {
        const [selectedLabel] = values;
        const value: string = selectedLabel.label;
        const updatedEntry = {
          field: exceptionItemEntry.field,
          operator: exceptionItemEntry.operator,
          match: value,
        };
        onEntryUpdate(updatedEntry, entryIndex);
      },
      [entryIndex, exceptionItemEntry]
    );

    const onMatchAnyChange = useCallback(
      (values: Array<EuiComboBoxOptionOption<string>>) => {
        const newValues: string[] = values.map(t => t.label);
        const updatedEntry = {
          field: exceptionItemEntry.field,
          operator: exceptionItemEntry.operator,
          match_any: newValues,
        };
        onEntryUpdate(updatedEntry, entryIndex);
      },
      [entryIndex, exceptionItemEntry]
    );

    const getEntryFieldInput = (value: string) => {
      const field = value.trim() === '' ? [] : [{ label: value }];

      return (
        <EuiComboBox
          className="exceptionsFieldInput"
          isLoading={indexPatternLoading}
          options={getAllCategoryFieldNames(browserFields, listType) ?? []}
          placeholder={i18n.EXCEPTION_FIELD_PLACEHOLDER}
          selectedOptions={field}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          onChange={onFieldChange}
          style={{ width: `${FIELD_COMBO_BOX_WIDTH}px` }}
          data-test-subj="exceptionsFieldSuggestionInput"
        />
      );
    };

    const getEntryValueInput = (entry: ExceptionItemEntry) => {
      const values = getEntryValue(entry);
      const type = getOperatorType(exceptionItemEntry);
      const formattedValues = formatFieldValues(values);

      switch (type) {
        case 'match_any':
          return (
            <EuiComboBox
              fullWidth
              noSuggestions
              placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
              selectedOptions={formattedValues}
              onChange={onMatchAnyChange}
              onCreateOption={updateMatchAnyEntryValue}
              isClearable={false}
              data-test-subj="exceptionBuilderMatchAnyComboBox"
            />
          );
        case 'match':
          return (
            <EuiComboBox
              fullWidth
              noSuggestions
              placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
              selectedOptions={formattedValues}
              onChange={onMatchChange}
              onCreateOption={updateMatchEntryValue}
              isClearable={false}
              data-test-subj="exceptionBuilderMatchComboBox"
              singleSelection={{ asPlainText: true }}
            />
          );
        case 'exists':
          return (
            <EuiComboBox
              fullWidth
              options={[]}
              placeholder={i18n.EXCEPTION_FIELD_VALUE_PLACEHOLDER}
              selectedOptions={[]}
              isClearable={false}
              singleSelection={{ asPlainText: true }}
              data-test-subj="exceptionBuilderExistsComboBox"
              isDisabled={true}
            />
          );
        case 'list':
          return (
            <EuiComboBox
              fullWidth
              options={[]}
              placeholder={i18n.EXCEPTION_LIST_VALUE_PLACEHOLDER}
              selectedOptions={formattedValues}
              onChange={onMatchAnyChange}
              onCreateOption={updateMatchEntryValue}
              isClearable={false}
              singleSelection={{ asPlainText: true }}
              data-test-subj="exceptionBuilderListComboBox"
            />
          );
        default:
          return '';
      }
    };

    const getEntryOperatorSelector = (entry: ExceptionItemEntry) => {
      const operatorOption = getExceptionOperatorSelect(entry);

      return (
        <EuiSelect
          options={getOperatorLabels(listType)}
          value={operatorOption ? operatorOption.value : ''}
          onChange={e => updateEntryOperator(e)}
          data-test-subj="exceptionBuilderOperatorSelect"
          style={{ width: `${OPERATOR_SELECT_WIDTH}px` }}
        />
      );
    };

    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        className="exceptionItemEntryContainer"
        data-test-subj="exceptionItemEntryContainer"
      >
        <EuiFlexItem grow={1}>
          {exceptionItemIndex === 0 && entryIndex === 0 ? (
            <EuiFormRowWrapper
              label={i18n.FIELD}
              data-test-subj="exceptionBuilderEntryFieldFormRow"
              describedByIds={
                idAria ? [`${idAria} exceptionBuilderEntryField`] : ['exceptionBuilderEntryField']
              }
            >
              <>{getEntryFieldInput(exceptionItemEntry.field)}</>
            </EuiFormRowWrapper>
          ) : (
            getEntryFieldInput(exceptionItemEntry.field)
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {exceptionItemIndex === 0 && entryIndex === 0 ? (
            <EuiFormRowWrapper
              label={i18n.OPERATOR}
              data-test-subj="exceptionBuilderEntryOperatorFormRow"
              describedByIds={
                idAria
                  ? [`${idAria} exceptionBuilderEntryOperator`]
                  : ['exceptionBuilderEntryOperator']
              }
            >
              <>{getEntryOperatorSelector(exceptionItemEntry)}</>
            </EuiFormRowWrapper>
          ) : (
            getEntryOperatorSelector(exceptionItemEntry)
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={6}>
          {exceptionItemIndex === 0 && entryIndex === 0 ? (
            <EuiFormRowWrapper
              label="Value"
              describedByIds={
                idAria ? [`${idAria} exceptionBuilderEntryValue`] : ['exceptionBuilderEntryValue']
              }
              data-test-subj="exceptionBuilderEntryValue"
            >
              <>{getEntryValueInput(exceptionItemEntry)}</>
            </EuiFormRowWrapper>
          ) : (
            getEntryValueInput(exceptionItemEntry)
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            onClick={() => onDeleteEntry(entryIndex)}
            aria-label={i18n.DELETE}
            className="exceptionItemEntryDeleteButton"
            data-test-subj="exceptionItemEntryDeleteButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

EntryItem.displayName = 'EntryItem';
