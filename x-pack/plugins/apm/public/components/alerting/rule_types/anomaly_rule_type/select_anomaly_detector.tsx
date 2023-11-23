/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import {
  AnomalyAlertDetectorType,
  ANOMALY_ALERT_DETECTOR_TYPES,
} from '../../../../../common/rules/apm_rule_types';

interface Props {
  onChange: (value: AnomalyAlertDetectorType) => void;
  value: AnomalyAlertDetectorType;
}

export function SelectAnomalyDetector({ onChange, value }: Props) {
  return (
    <EuiSuperSelect
      hasDividers
      style={{ width: 200 }}
      options={ANOMALY_ALERT_DETECTOR_TYPES.map((option) => ({
        value: option.type,
        inputDisplay: option.type,
        dropdownDisplay: option.type,
      }))}
      valueOfSelected={value}
      onChange={(selectedValue: AnomalyAlertDetectorType) => {
        onChange(selectedValue);
      }}
    />
  );
}
