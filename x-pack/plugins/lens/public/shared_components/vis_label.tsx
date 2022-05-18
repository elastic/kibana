/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type LabelMode = 'auto' | 'custom' | 'none';

export interface Label {
  mode: LabelMode;
  label: string;
}

export interface VisLabelProps {
  label: string;
  mode: LabelMode;
  handleChange: (label: Label) => void;
  placeholder?: string;
  hasAutoOption?: boolean;
  header?: string;
  dataTestSubj?: string;
}

const defaultHeader = i18n.translate('xpack.lens.label.header', {
  defaultMessage: 'Label',
});

const MODE_NONE = {
  id: `lns_title_none`,
  value: 'none',
  text: i18n.translate('xpack.lens.chart.labelVisibility.none', {
    defaultMessage: 'None',
  }),
};

const MODE_CUSTOM = {
  id: `lns_title_custom`,
  value: 'custom',
  text: i18n.translate('xpack.lens.chart.labelVisibility.custom', {
    defaultMessage: 'Custom',
  }),
};

const MODE_AUTO = {
  id: `lns_title_auto`,
  value: 'auto',
  text: i18n.translate('xpack.lens.chart.labelVisibility.auto', {
    defaultMessage: 'Auto',
  }),
};

const modeDefaultOptions = [MODE_NONE, MODE_CUSTOM];

const modeEnhancedOptions = [MODE_NONE, MODE_AUTO, MODE_CUSTOM];

export function VisLabel({
  label,
  mode,
  handleChange,
  hasAutoOption = false,
  placeholder = '',
  header = defaultHeader,
  dataTestSubj,
}: VisLabelProps) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiSelect
          fullWidth
          compressed
          data-test-subj={`${dataTestSubj}-select`}
          aria-label="Label"
          onChange={({ target }) => {
            if (target.value === 'custom') {
              handleChange({ label: '', mode: target.value as LabelMode });
              return;
            }
            handleChange({ label: '', mode: target.value as LabelMode });
          }}
          options={hasAutoOption ? modeEnhancedOptions : modeDefaultOptions}
          value={mode}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFieldText
          data-test-subj={dataTestSubj}
          compressed
          placeholder={mode === 'none' ? '' : placeholder}
          value={label || ''}
          disabled={mode === 'none'}
          onChange={({ target }) => handleChange({ mode: 'custom', label: target.value })}
          aria-label={header}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
