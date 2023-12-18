/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import { ANOMALY_DETECTOR_SELECTOR_OPTIONS } from '../../../../../common/rules/apm_rule_types';
import { ApmMlDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';

interface Props {
  values: ApmMlDetectorType[];
  onChange: (values?: ApmMlDetectorType[]) => void;
}

export function SelectAnomalyDetector({ values, onChange }: Props) {
  const options: EuiSelectableOption[] = ANOMALY_DETECTOR_SELECTOR_OPTIONS.map(
    (option) => ({
      key: option.type,
      label: option.label,
      checked: values.includes(option.type) ? 'on' : undefined,
    })
  );

  const onOptionSelect = useCallback(
    (selectedOptions: EuiSelectableOption[]) => {
      const selectedTypes = selectedOptions
        .filter(({ checked }) => checked === 'on')
        .map(({ key }) => key as ApmMlDetectorType);
      if (selectedTypes.length === 0) {
        // we don't change last selection if all the options has been unchecked, at least one detector needs to be selected
        onChange(values);
      } else {
        onChange(selectedTypes);
      }
    },
    [onChange, values]
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
