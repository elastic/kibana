/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSelect } from '@elastic/eui';
import type { AnomalyThreshold } from '@kbn/apm-types';
import { ENVIRONMENT_ALL } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import React from 'react';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';

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

export function AnomalyThresholdSelect({
  anomalyThreshold,
  kuery,
  onChange,
}: {
  anomalyThreshold: AnomalyThreshold;
  kuery: string;
  onChange: (value: AnomalyThreshold) => void;
}) {
  const { environment } = useEnvironmentsContext();

  const isAllEnvironments = environment === ENVIRONMENT_ALL.value;
  const hasKueryFilter = !!kuery;
  const isDisabled = isAllEnvironments || hasKueryFilter;

  const tooltipContent = isAllEnvironments
    ? i18n.translate('xpack.apm.anomalyThresholdSelect.allEnvironmentsTooltip', {
        defaultMessage: 'Select a specific environment to view machine learning results',
      })
    : i18n.translate('xpack.apm.anomalyThresholdSelect.kueryFilterTooltip', {
        defaultMessage: 'Machine learning results are hidden while a search bar filter is applied',
      });

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
          value={isDisabled ? 'none' : anomalyThreshold}
          onChange={(nextOption) => onChange(nextOption.target.value as AnomalyThreshold)}
          disabled={isDisabled}
        />
      </EuiFlexItem>
      {isDisabled && (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="question"
            content={tooltipContent}
            data-test-subj="apmAnomalyThresholdSelectTooltip"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
