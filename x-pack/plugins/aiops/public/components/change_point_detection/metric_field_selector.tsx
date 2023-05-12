/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { useChangePointDetectionContext } from './change_point_detection_context';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

interface MetricFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MetricFieldSelector: FC<MetricFieldSelectorProps> = React.memo(
  ({ value, onChange }) => {
    const { fieldStats } = useAiopsAppContext();
    const { metricFieldOptions } = useChangePointDetectionContext();

    const { renderOption, closeFlyout } = fieldStats!.useFieldStatsTrigger();

    const options = useMemo<EuiComboBoxOptionOption[]>(() => {
      return metricFieldOptions.map((v) => {
        return {
          value: v.name,
          label: v.displayName,
          field: { id: v.name, type: v.type },
        };
      });
    }, [metricFieldOptions]);

    const selection = options.filter((v) => v.value === value);

    const onChangeCallback = useCallback(
      (selectedOptions: EuiComboBoxOptionOption[]) => {
        const option = selectedOptions[0];
        if (typeof option !== 'undefined') {
          onChange(option.value as string);
        }
        closeFlyout();
      },
      [onChange, closeFlyout]
    );

    return (
      <>
        <EuiFormRow>
          <EuiComboBox
            compressed
            prepend={i18n.translate('xpack.aiops.changePointDetection.selectMetricFieldLabel', {
              defaultMessage: 'Metric field',
            })}
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={selection}
            onChange={onChangeCallback}
            isClearable={false}
            data-test-subj="aiopsChangePointMetricField"
            // @ts-ignore
            renderOption={renderOption}
          />
        </EuiFormRow>
      </>
    );
  }
);
