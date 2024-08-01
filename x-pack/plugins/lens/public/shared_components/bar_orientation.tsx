/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';

type BarOrientation = 'vertical' | 'horizontal';

const barOrientationOptions: Array<{
  id: string;
  value: BarOrientation;
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: `bar_orientation_horizontal`,
    value: 'horizontal',
    label: i18n.translate('xpack.lens.shared.barOrientation.horizontal', {
      defaultMessage: 'Horizontal',
    }),
    'data-test-subj': 'lns_barOrientation_horizontal',
  },
  {
    id: `bar_orientation_vertical`,
    value: 'vertical',
    label: i18n.translate('xpack.lens.shared.barOrientation.vertical', {
      defaultMessage: 'Vertical',
    }),
    'data-test-subj': 'lns_barOrientation_vertical',
  },
];

export interface BarOrientationProps {
  barOrientation?: BarOrientation;
  onBarOrientationChange: (newMode: BarOrientation) => void;
}

export const BarOrientationSettings: FC<BarOrientationProps> = ({
  barOrientation = 'horizontal',
  onBarOrientationChange,
}) => {
  const label = i18n.translate('xpack.lens.shared.barOrientation', {
    defaultMessage: 'Bar orientation',
  });
  const isSelected =
    barOrientationOptions.find(({ value }) => value === barOrientation)?.id ||
    'bar_orientation_horizontal';

  return (
    <EuiFormRow display="columnCompressed" label={label} fullWidth>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lns_barOrientation"
        buttonSize="compressed"
        options={barOrientationOptions}
        idSelected={isSelected}
        onChange={(modeId) => {
          const newMode = barOrientationOptions.find(({ id }) => id === modeId);
          if (newMode) {
            onBarOrientationChange(newMode.value);
          }
        }}
      />
    </EuiFormRow>
  );
};
