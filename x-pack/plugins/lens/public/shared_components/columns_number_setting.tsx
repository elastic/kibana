/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { useDebouncedValue } from './debounced_value';

export const DEFAULT_FLOATING_COLUMNS = 1;

interface ColumnsNumberSettingProps {
  /**
   * Sets the number of columns for legend inside chart
   */
  floatingColumns?: number;
  /**
   * Callback on horizontal alignment option change
   */
  onFloatingColumnsChange?: (value: number) => void;
  /**
   * Indicates if legend is located outside
   */
  isLegendOutside: boolean;
}

export const ColumnsNumberSetting = ({
  floatingColumns,
  onFloatingColumnsChange = () => {},
  isLegendOutside,
}: ColumnsNumberSettingProps) => {
  const { inputValue, handleInputChange } = useDebouncedValue({
    value: floatingColumns ?? DEFAULT_FLOATING_COLUMNS,
    onChange: onFloatingColumnsChange,
  });

  if (isLegendOutside) return null;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.shared.legendInsideColumnsLabel', {
        defaultMessage: 'Number of columns',
      })}
      fullWidth
      display="columnCompressed"
    >
      <EuiFieldNumber
        data-test-subj="lens-legend-location-columns-input"
        value={inputValue}
        min={1}
        max={5}
        compressed
        onChange={(e) => {
          handleInputChange(Number(e.target.value));
        }}
        step={1}
      />
    </EuiFormRow>
  );
};
