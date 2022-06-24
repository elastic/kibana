/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, MouseEvent, FunctionComponent, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiRange,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
} from '@elastic/eui';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { get, set } from 'lodash';
import { defaultExpression } from './default_expression';

export interface Props {
  onValueChange: (argValue: ExpressionAstExpression) => void;
  argValue: null | ExpressionAstExpression;
}

interface PartitionLabelsArguments {
  show: boolean;
  position: 'inside' | 'default';
  values: boolean;
  valuesFormat: 'percent' | 'value';
  percentDecimals: number;
}

type Fields = keyof PartitionLabelsArguments;

export const ExtendedTemplate: FunctionComponent<Props> = ({ onValueChange, argValue }) => {
  const getFieldPath = (field: keyof PartitionLabelsArguments) => `chain.0.arguments.${field}.0`;

  const getFieldValue = (
    ast: null | ExpressionAstExpression,
    field: keyof PartitionLabelsArguments
  ) => {
    if (!ast) {
      return null;
    }

    return get(ast, getFieldPath(field));
  };

  const showLabels = getFieldValue(argValue, 'show');
  const showValues = getFieldValue(argValue, 'values');
  const valueFormat = getFieldValue(argValue, 'valuesFormat');
  const percentDecimals = getFieldValue(argValue, 'percentDecimals');

  const positions: EuiSelectOption[] = [
    { text: 'Default', value: 'default' },
    { text: 'Inside', value: 'inside' },
  ];

  const valuesFormats: EuiSelectOption[] = [
    { text: 'Value', value: 'value' },
    { text: 'Percent', value: 'percent' },
  ];

  useEffect(() => {
    if (!argValue) {
      onValueChange(defaultExpression());
    }
  }, [argValue, onValueChange]);

  const onChangeField = useCallback(
    (field: Fields, value: unknown) => {
      const path = getFieldPath(field);
      const oldArgValue = argValue ?? defaultExpression();
      const newArgValue = set(oldArgValue, path, value);

      onValueChange(newArgValue);
    },
    [argValue, onValueChange]
  );

  const onToggleFieldChange = useCallback(
    (field: Fields) => (event: EuiSwitchEvent) => {
      onChangeField(field, event.target.checked);
    },
    [onChangeField]
  );

  const onCommonFieldChange = useCallback(
    (field: Fields) =>
      (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement> | MouseEvent<HTMLButtonElement>
      ) => {
        onChangeField(field, event.currentTarget.value);
      },
    [onChangeField]
  );

  if (!showLabels) {
    return (
      <EuiText color="subdued" size="xs">
        <p>Switch on to view labels settings</p>
      </EuiText>
    );
  }

  return (
    <>
      <EuiFormRow label={'Position'} display="columnCompressed">
        <EuiSelect
          compressed
          value={getFieldValue(argValue, 'position')}
          options={positions}
          onChange={onCommonFieldChange('position')}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow label={'Values'} display="columnCompressedSwitch">
        <EuiSwitch
          compressed
          checked={showValues}
          onChange={onToggleFieldChange('values')}
          label="Show"
        />
      </EuiFormRow>
      {showValues && (
        <EuiFormRow label={'Values format'} display="columnCompressed">
          <EuiSelect
            compressed
            value={valueFormat}
            options={valuesFormats}
            onChange={onCommonFieldChange('valuesFormat')}
          />
        </EuiFormRow>
      )}
      {showValues && valueFormat === 'percent' && (
        <EuiFormRow label={'Percent decimals'} display="columnCompressed">
          <EuiRange
            compressed
            min={0}
            max={10}
            step={1}
            showLabels
            showInput
            value={percentDecimals}
            onChange={(e, isValid) => {
              if (isValid) {
                onCommonFieldChange('percentDecimals')(e);
              }
            }}
          />
        </EuiFormRow>
      )}
    </>
  );
};

ExtendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
};

ExtendedTemplate.displayName = 'PartitionLabelsExtendedArg';
