/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';
import { getSeverityColor } from '../../app/ServiceMap/cytoscapeOptions';
import { useTheme } from '../../../hooks/useTheme';
import { severity as Severity } from '../../app/ServiceMap/Popover/getSeverity';

type SeverityScore = 0 | 25 | 50 | 75;
const ANOMALY_SCORES: SeverityScore[] = [0, 25, 50, 75];

const anomalyScoreSeverityMap: {
  [key in SeverityScore]: { label: string; severity: Severity };
} = {
  0: {
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.warningLabel', {
      defaultMessage: 'warning',
    }),
    severity: Severity.warning,
  },
  25: {
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.minorLabel', {
      defaultMessage: 'minor',
    }),
    severity: Severity.minor,
  },
  50: {
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.majorLabel', {
      defaultMessage: 'major',
    }),
    severity: Severity.major,
  },
  75: {
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.criticalLabel', {
      defaultMessage: 'critical',
    }),
    severity: Severity.critical,
  },
};

export function AnomalySeverity({
  severityScore,
}: {
  severityScore: SeverityScore;
}) {
  const theme = useTheme();
  const { label, severity } = anomalyScoreSeverityMap[severityScore];
  const defaultColor = theme.eui.euiColorMediumShade;
  const color = getSeverityColor(theme, severity) || defaultColor;
  return (
    <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
      {label}
    </EuiHealth>
  );
}

const getOption = (value: SeverityScore) => {
  return {
    value: value.toString(10),
    inputDisplay: <AnomalySeverity severityScore={value} />,
    dropdownDisplay: (
      <>
        <AnomalySeverity severityScore={value} />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p className="euiTextColor--subdued">
            <FormattedMessage
              id="xpack.apm.alerts.anomalySeverity.scoreDetailsDescription"
              defaultMessage="score {value} and above"
              values={{ value }}
            />
          </p>
        </EuiText>
      </>
    ),
  };
};

interface Props {
  onChange: (value: SeverityScore) => void;
  value: SeverityScore;
}

export function SelectAnomalySeverity({ onChange, value }: Props) {
  const options = ANOMALY_SCORES.map((anomalyScore) => getOption(anomalyScore));

  return (
    <EuiSuperSelect
      hasDividers
      style={{ width: 200 }}
      options={options}
      valueOfSelected={value.toString(10)}
      onChange={(selectedValue: string) => {
        const selectedAnomalyScore = parseInt(
          selectedValue,
          10
        ) as SeverityScore;
        onChange(selectedAnomalyScore);
      }}
    />
  );
}
