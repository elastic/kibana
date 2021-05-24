/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSpacer, EuiRange } from '@elastic/eui';

export interface FillOpacityOptionProps {
  /**
   * Currently selected value
   */
  value: number;
  /**
   * Callback on display option change
   */
  onChange: (value: number) => void;
  isFillOpacityEnabled?: boolean;
}

export const FillOpacityOption: React.FC<FillOpacityOptionProps> = ({
  onChange,
  value,
  isFillOpacityEnabled = true,
}) => {
  return isFillOpacityEnabled ? (
    <>
      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.translate('xpack.lens.xyChart.fillOpacityLabel', {
          defaultMessage: 'Fill opacity',
        })}
      >
        <EuiRange
          data-test-subj="lnsFillOpacity"
          value={value}
          min={0.1}
          max={1}
          step={0.1}
          showInput
          compressed
          onChange={(e) => {
            onChange(Number(e.currentTarget.value));
          }}
        />
      </EuiFormRow>
      <EuiSpacer />
    </>
  ) : null;
};
