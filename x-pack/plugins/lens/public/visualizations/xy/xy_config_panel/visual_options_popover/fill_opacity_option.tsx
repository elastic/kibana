/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { useDebouncedValue } from '../../../../shared_components';

export interface FillOpacityOptionProps {
  /**
   * Currently selected value
   */
  value: number;
  /**
   * Callback on display option change
   */
  onChange: (value: number) => void;
  /**
   * Flag for rendering or not the component
   */
  isFillOpacityEnabled?: boolean;
}

export const FillOpacityOption: React.FC<FillOpacityOptionProps> = ({
  onChange,
  value,
  isFillOpacityEnabled = true,
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange });
  return isFillOpacityEnabled ? (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.fillOpacityLabel', {
          defaultMessage: 'Fill opacity',
        })}
        fullWidth
      >
        <EuiRange
          data-test-subj="lnsFillOpacity"
          value={inputValue}
          min={0.1}
          max={1}
          step={0.1}
          showInput
          compressed
          fullWidth
          onChange={(e) => {
            handleInputChange(Number(e.currentTarget.value));
          }}
        />
      </EuiFormRow>
    </>
  ) : null;
};
