/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { useChangePontDetectionContext } from './change_point_detection_context';

interface MetricFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MetricFieldSelector: FC<MetricFieldSelectorProps> = React.memo(
  ({ value, onChange }) => {
    const { metricFieldOptions } = useChangePontDetectionContext();

    const options = useMemo<EuiSelectOption[]>(() => {
      return metricFieldOptions.map((v) => ({ value: v.name, text: v.displayName }));
    }, [metricFieldOptions]);

    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.aiops.changePointDetection.selectMetricFieldLabel"
            defaultMessage="Metric field"
          />
        }
      >
        <EuiSelect options={options} value={value} onChange={(e) => onChange(e.target.value)} />
      </EuiFormRow>
    );
  }
);
