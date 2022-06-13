/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { XYCurveType } from '../../../../../../../src/plugins/chart_expressions/expression_xy/common';

export interface LineCurveOptionProps {
  /**
   * Currently selected value
   */
  value?: XYCurveType;
  /**
   * Callback on display option change
   */
  onChange: (id: XYCurveType) => void;
  isCurveTypeEnabled?: boolean;
}

export const LineCurveOption: React.FC<LineCurveOptionProps> = ({
  onChange,
  value,
  isCurveTypeEnabled = true,
}) => {
  return isCurveTypeEnabled ? (
    <EuiFormRow
      display="columnCompressedSwitch"
      label={i18n.translate('xpack.lens.xyChart.curveStyleLabel', {
        defaultMessage: 'Curve lines',
      })}
    >
      <EuiSwitch
        showLabel={false}
        label="Curved"
        checked={value === 'CURVE_MONOTONE_X'}
        compressed={true}
        onChange={(e) => {
          if (e.target.checked) {
            onChange('CURVE_MONOTONE_X');
          } else {
            onChange('LINEAR');
          }
        }}
        data-test-subj="lnsCurveStyleToggle"
      />
    </EuiFormRow>
  ) : null;
};
