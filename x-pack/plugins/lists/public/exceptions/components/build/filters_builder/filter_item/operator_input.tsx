/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-bind */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable func-style */

import React, { useCallback, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/common';

import type { Operator } from '../../filter_bar/filter_editor';
import { GenericComboBox, getOperatorOptions } from '../../filter_bar/filter_editor';
import { FiltersBuilderContextType } from '../context';

export const strings = {
  getOperatorSelectPlaceholderSelectLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.operatorSelectPlaceholderSelect', {
      defaultMessage: 'Select operator',
    }),
};

interface OperatorInputProps<TParams = unknown> {
  field: DataViewField | undefined;
  operator: Operator | undefined;
  params: TParams;
  operators: Operator[];
  onHandleOperator: (operator: Operator, params?: TParams) => void;
}

export function OperatorInput<TParams = unknown>({
  field,
  operator,
  params,
  onHandleOperator,
  operators,
}: OperatorInputProps<TParams>) {
  const { disabled } = useContext(FiltersBuilderContextType);
  const operatorsAvailable = field ? getOperatorOptions(field, operators) : [];

  const onOperatorChange = useCallback(
    ([selectedOperator]: Operator[]) => {
      const selectedParams = selectedOperator === operator ? params : undefined;

      onHandleOperator(selectedOperator, selectedParams);
    },
    [onHandleOperator, operator, params]
  );

  return (
    <GenericComboBox
      fullWidth
      compressed
      isDisabled={!field || disabled}
      placeholder={strings.getOperatorSelectPlaceholderSelectLabel()}
      aria-label={strings.getOperatorSelectPlaceholderSelectLabel()}
      options={operatorsAvailable}
      selectedOptions={operator ? [operator] : []}
      getLabel={({ message }) => message}
      onChange={onOperatorChange}
      singleSelection={{ asPlainText: true }}
      isClearable={false}
      data-test-subj="filterOperatorList"
    />
  );
}
