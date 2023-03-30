/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { useChangePointDetectionContext } from './change_point_detection_context';

interface MetricFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MetricFieldSelector: FC<MetricFieldSelectorProps> = React.memo(
  ({ value, onChange }) => {
    const { metricFieldOptions } = useChangePointDetectionContext();

    const options = useMemo<EuiComboBoxOptionOption[]>(() => {
      return metricFieldOptions.map((v) => ({ value: v.name, label: v.displayName }));
    }, [metricFieldOptions]);

    const selection = options.filter((v) => v.value === value);

    const onChangeCallback = useCallback(
      (selectedOptions: EuiComboBoxOptionOption[]) => {
        const option = selectedOptions[0];
        if (typeof option !== 'undefined') {
          onChange(option.label);
        }
      },
      [onChange]
    );

    return (
      <EuiFormRow>
        <EuiComboBox
          prepend={i18n.translate('xpack.aiops.changePointDetection.selectMetricFieldLabel', {
            defaultMessage: 'Metric field',
          })}
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selection}
          onChange={onChangeCallback}
          isClearable={false}
          data-test-subj="aiopsChangePointMetricField"
        />
      </EuiFormRow>
    );
  }
);
