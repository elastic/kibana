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
import { TooltipWrapper } from './tooltip_wrapper';

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
   * Flag to disable the location settings
   */
  isDisabled: boolean;
  /**
   * Indicates if legend is located outside
   */
  isLegendOutside: boolean;
}

export const ColumnsNumberSetting = ({
  floatingColumns,
  onFloatingColumnsChange = () => {},
  isDisabled,
  isLegendOutside,
}: ColumnsNumberSettingProps) => {
  const { inputValue, handleInputChange } = useDebouncedValue({
    value: floatingColumns ?? DEFAULT_FLOATING_COLUMNS,
    onChange: onFloatingColumnsChange,
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.shared.legendInsideColumnsLabel', {
        defaultMessage: 'Number of columns',
      })}
      fullWidth
      display="columnCompressed"
    >
      <TooltipWrapper
        tooltipContent={
          isDisabled
            ? i18n.translate('xpack.lens.shared.legendVisibleTooltip', {
                defaultMessage: 'Requires legend to be shown',
              })
            : i18n.translate('xpack.lens.shared.legendInsideTooltip', {
                defaultMessage: 'Requires legend to be located inside visualization',
              })
        }
        condition={isDisabled || isLegendOutside}
        position="top"
        delay="regular"
        display="block"
      >
        <EuiFieldNumber
          data-test-subj="lens-legend-location-columns-input"
          value={inputValue}
          min={1}
          max={5}
          compressed
          disabled={isDisabled || isLegendOutside}
          onChange={(e) => {
            handleInputChange(Number(e.target.value));
          }}
          step={1}
        />
      </TooltipWrapper>
    </EuiFormRow>
  );
};
