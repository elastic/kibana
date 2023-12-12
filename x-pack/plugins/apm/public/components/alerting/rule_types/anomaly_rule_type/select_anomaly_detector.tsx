/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import {
  AnomalyAlertDetectorType,
  ANOMALY_ALERT_DETECTORS,
} from '../../../../../common/rules/apm_rule_types';

interface Props {
  values: AnomalyAlertDetectorType[];
  onChange: (values?: AnomalyAlertDetectorType[]) => void;
}

export function SelectAnomalyDetector({ values, onChange }: Props) {
  const options: EuiSelectableOption[] = ANOMALY_ALERT_DETECTORS.map(
    (option) => ({
      key: option.type,
      label: option.label,
      checked: values.includes(option.type) ? 'on' : undefined,
    })
  );

  const onOptionSelect = useCallback(
    (selectedOptions: EuiSelectableOption[]) => {
      onChange(
        selectedOptions
          .filter(({ checked }) => checked === 'on')
          .map(({ key }) => key) as AnomalyAlertDetectorType[]
      );
    },
    [onChange]
  );

  return (
    <EuiSelectable
      options={options}
      onChange={onOptionSelect}
      style={{ width: 200 }}
    >
      {(list) => list}
    </EuiSelectable>
  );
}
