/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSelect } from '@elastic/eui';
import { getEnvironmentLabel, type AnomalyThreshold } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import React from 'react';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import type { AnomalyThresholdDisabledReason } from '../../../../hooks/use_anomaly_threshold';
import { useAnomalyThreshold } from '../../../../hooks/use_anomaly_threshold';

const getOptions = (): Array<{ value: AnomalyThreshold; text: string }> => [
  {
    value: ML_ANOMALY_SEVERITY.CRITICAL,
    text: i18n.translate('xpack.apm.anomalyThresholdSelect.criticalLabel', {
      defaultMessage: 'Critical',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.MAJOR,
    text: i18n.translate('xpack.apm.anomalyThresholdSelect.majorLabel', {
      defaultMessage: 'Major or above',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.MINOR,
    text: i18n.translate('xpack.apm.anomalyThresholdSelect.minorLabel', {
      defaultMessage: 'Minor or above',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.WARNING,
    text: i18n.translate('xpack.apm.anomalyThresholdSelect.warningLabel', {
      defaultMessage: 'Warning or above',
    }),
  },
  {
    value: ML_ANOMALY_SEVERITY.LOW,
    text: i18n.translate('xpack.apm.anomalyThresholdSelect.lowLabel', {
      defaultMessage: 'Low or above',
    }),
  },
  {
    value: 'none',
    text: i18n.translate('xpack.apm.anomalyThresholdSelect.noneLabel', {
      defaultMessage: 'None',
    }),
  },
];

const getTooltipContent = (disabledReason: AnomalyThresholdDisabledReason, environment: string) => {
  switch (disabledReason) {
    case 'allEnvironments':
      return i18n.translate('xpack.apm.anomalyThresholdSelect.allEnvironmentsTooltip', {
        defaultMessage: 'Select a specific environment to view anomaly detection data',
      });
    case 'notConfiguredForEnvironment':
      return i18n.translate('xpack.apm.anomalyThresholdSelect.notConfiguredForEnvironmentTooltip', {
        defaultMessage: 'Anomaly detection is not enabled for environment "{environment}"',
        values: { environment: getEnvironmentLabel(environment) },
      });
    case 'kuery':
      return i18n.translate('xpack.apm.anomalyThresholdSelect.kueryFilterTooltip', {
        defaultMessage: 'Anomaly detection data is hidden while a search bar filter is applied',
      });
    default:
      return '';
  }
};

export function AnomalyThresholdSelect({
  onChange,
}: {
  onChange: (value: AnomalyThreshold) => void;
}) {
  const { preferredEnvironment } = useEnvironmentsContext();
  const { anomalyThreshold, isDisabled, disabledReason } = useAnomalyThreshold();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiSelect
          data-test-subj="apmAnomalyThresholdSelect"
          compressed
          aria-label={i18n.translate('xpack.apm.anomalyThresholdSelect.ariaLabel', {
            defaultMessage: 'Anomaly threshold selector',
          })}
          prepend={i18n.translate('xpack.apm.anomalyThresholdSelect.prepend', {
            defaultMessage: 'Anomalies',
          })}
          options={getOptions()}
          value={anomalyThreshold}
          onChange={(nextOption) => onChange(nextOption.target.value as AnomalyThreshold)}
          disabled={isDisabled}
        />
      </EuiFlexItem>
      {isDisabled && (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="question"
            content={getTooltipContent(disabledReason, preferredEnvironment)}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
