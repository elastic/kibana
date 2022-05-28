/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';
import { getSeverityColor } from '../../../../common/anomaly_detection';
import {
  AnomalyAlertSeverityType,
  ANOMALY_ALERT_SEVERITY_TYPES,
} from '../../../../common/alert_types';

export function AnomalySeverity({ type }: { type: AnomalyAlertSeverityType }) {
  const selectedOption = ANOMALY_ALERT_SEVERITY_TYPES.find(
    (option) => option.type === type
  )!;
  return (
    <EuiHealth
      color={getSeverityColor(selectedOption.threshold)}
      style={{ lineHeight: 'inherit' }}
    >
      {selectedOption.label}
    </EuiHealth>
  );
}

interface Props {
  onChange: (value: AnomalyAlertSeverityType) => void;
  value: AnomalyAlertSeverityType;
}

export function SelectAnomalySeverity({ onChange, value }: Props) {
  return (
    <EuiSuperSelect
      hasDividers
      style={{ width: 200 }}
      options={ANOMALY_ALERT_SEVERITY_TYPES.map((option) => ({
        value: option.type,
        inputDisplay: <AnomalySeverity type={option.type} />,
        dropdownDisplay: (
          <>
            <AnomalySeverity type={option.type} />
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p
                className="euiTextColor--subdued"
                data-test-subj="SelectAnomalySeverity option text"
              >
                <FormattedMessage
                  id="xpack.apm.alerts.anomalySeverity.scoreDetailsDescription"
                  defaultMessage="score {value} {value, select, critical {} other {and above}}"
                  values={{ value: option.type }}
                />
              </p>
            </EuiText>
          </>
        ),
      }))}
      valueOfSelected={value}
      onChange={(selectedValue: AnomalyAlertSeverityType) => {
        onChange(selectedValue);
      }}
    />
  );
}
