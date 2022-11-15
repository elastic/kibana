/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { useChangePointDetectionContext } from './change_point_detection_context';

interface MetricFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MetricFieldSelector: FC<MetricFieldSelectorProps> = React.memo(
  ({ value, onChange }) => {
    const { metricFieldOptions } = useChangePointDetectionContext();

    const options = useMemo<EuiSelectOption[]>(() => {
      return metricFieldOptions.map((v) => ({ value: v.name, text: v.displayName }));
    }, [metricFieldOptions]);

    return (
      <EuiFormRow>
        <EuiSelect
          prepend={i18n.translate('xpack.aiops.changePointDetection.selectMetricFieldLabel', {
            defaultMessage: 'Metric field',
          })}
          options={options}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </EuiFormRow>
    );
  }
);
