/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { ValueLabelConfig } from '../../common/types';

const valueLabelsOptions: Array<{
  id: string;
  value: ValueLabelConfig;
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: `value_labels_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.shared.valueLabelsVisibility.auto', {
      defaultMessage: 'Hide',
    }),
    'data-test-subj': 'lns_valueLabels_hide',
  },
  {
    id: `value_labels_inside`,
    value: 'show',
    label: i18n.translate('xpack.lens.shared.valueLabelsVisibility.show', {
      defaultMessage: 'Show, if able',
    }),
    'data-test-subj': 'lns_valueLabels_inside',
  },
];

export interface VisualOptionsProps {
  isVisible?: boolean;
  valueLabels?: ValueLabelConfig;
  onValueLabelChange: (newMode: ValueLabelConfig) => void;
  label?: string;
}

const defaultLabel = i18n.translate('xpack.lens.shared.chartValueLabelVisibilityLabel', {
  defaultMessage: 'Value labels',
});

export const ValueLabelsSettings: FC<VisualOptionsProps> = ({
  isVisible = true,
  valueLabels = 'hide',
  onValueLabelChange,
  label = defaultLabel,
}) => {
  if (!isVisible) {
    return null;
  }

  const isSelected =
    valueLabelsOptions.find(({ value }) => value === valueLabels)?.id || 'value_labels_hide';
  return (
    <EuiFormRow
      fullWidth
      display="columnCompressed"
      helpText={i18n.translate('xpack.lens.shared.chartValueLabelVisibilityHelpText', {
        defaultMessage: 'Values can only be shown if space is available.',
      })}
      label={label}
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-value-labels-visibility-btn"
        buttonSize="compressed"
        options={valueLabelsOptions}
        idSelected={isSelected}
        onChange={(modeId) => {
          const newMode = valueLabelsOptions.find(({ id }) => id === modeId);
          if (newMode) {
            onValueLabelChange(newMode.value);
          }
        }}
      />
    </EuiFormRow>
  );
};
