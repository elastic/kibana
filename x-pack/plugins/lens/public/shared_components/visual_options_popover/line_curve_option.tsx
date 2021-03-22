/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CurveType } from '@elastic/charts';
import { EuiFormRow, EuiIconTip, EuiSwitch } from '@elastic/eui';

export interface LineCurveOptionProps {
  /**
   * Currently selected value
   */
  value: CurveType;
  /**
   * Callback on display option change
   */
  onChange: (id: CurveType) => void;
  isCurveTypeEnabled: boolean;
}

export const LineCurveOption: React.FC<LineCurveOptionProps> = ({
  onChange,
  value,
  isCurveTypeEnabled,
}) => {
  return isCurveTypeEnabled ? (
    <EuiFormRow
      display="columnCompressedSwitch"
      label={
        <>
          {i18n.translate('xpack.lens.xyChart.curveStyleLabel', {
            defaultMessage: 'Line style',
          })}
          <EuiIconTip
            color="subdued"
            content={i18n.translate('xpack.lens.xyChart.curveStyleLabelHelpText', {
              defaultMessage: `By default, Lines are not curved.`,
            })}
            iconProps={{
              className: 'eui-alignTop',
            }}
            position="top"
            size="s"
            type="questionInCircle"
          />
        </>
      }
    >
      <EuiSwitch
        label="Curved"
        checked={value === CurveType.CURVE_MONOTONE_X}
        compressed={true}
        onChange={(e) => {
          if (e.target.checked) {
            onChange(CurveType.CURVE_MONOTONE_X);
          } else {
            onChange(CurveType.LINEAR);
          }
        }}
        data-test-subj="lnsCurveStyleToggle"
      />
    </EuiFormRow>
  ) : null;
};
