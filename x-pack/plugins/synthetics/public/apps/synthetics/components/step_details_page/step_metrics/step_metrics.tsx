/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiFlexGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ThresholdIndicator } from '../../common/components/thershold_indicator';
import { DefinitionsPopover } from './definitions_popover';
import { useStepMetrics } from '../hooks/use_step_metrics';
import { useStepPrevMetrics } from '../hooks/use_step_prev_metrics';

export const formatMillisecond = (ms: number) => {
  if (ms < 0) {
    return '- ms';
  }

  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
};

export const StepMetrics = () => {
  const { metrics: stepMetrics } = useStepMetrics();
  const { metrics: prevMetrics, loading } = useStepPrevMetrics();

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>{METRICS_LABEL}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DefinitionsPopover />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGrid gutterSize="l" columns={3}>
        {stepMetrics.map(({ label, value, helpText, formatted }) => {
          const prevVal = prevMetrics.find((prev) => prev.label === label);

          if (label)
            return (
              <EuiFlexItem key={label}>
                <ThresholdIndicator
                  asStat={true}
                  loading={loading}
                  description={label}
                  current={value ?? 0}
                  previous={prevVal?.value ?? 0}
                  helpText={helpText}
                  currentFormatted={formatted}
                  previousFormatted={prevVal?.formatted}
                />
              </EuiFlexItem>
            );
        })}
      </EuiFlexGrid>
    </>
  );
};

const METRICS_LABEL = i18n.translate('xpack.synthetics.stepDetailsRoute.metrics', {
  defaultMessage: 'Metrics',
});
