/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  EuiIcon,
  EuiIconTip,
  EuiFlexGrid,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CLS_HELP_LABEL, DCL_TOOLTIP, FCP_TOOLTIP, LCP_HELP_LABEL } from './labels';
import { DefinitionsPopover } from './definitions_popover';
import { useStepMetrics } from '../hooks/use_step_metrics';
import { useStepPrevMetrics } from '../hooks/use_step_prev_metrics';

export const formatMillisecond = (ms: number) => {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
};

export const StepMetrics = () => {
  const stepMetrics = useStepMetrics();

  const { fcpThreshold, lcpThreshold, clsThreshold, dclThreshold, totalThreshold } =
    useStepPrevMetrics(stepMetrics);

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
        <EuiFlexItem>
          <StatThreshold
            description={TOTAL_DURATION_LABEL}
            title={formatMillisecond((stepMetrics.totalDuration?.value ?? 0) / 1000)}
            threshold={totalThreshold}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StatThreshold
            description={'FCP'}
            title={formatMillisecond((stepMetrics.fcp?.value ?? 0) / 1000)}
            threshold={fcpThreshold}
            helpText={FCP_TOOLTIP}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StatThreshold
            description={'LCP'}
            title={formatMillisecond((stepMetrics.lcp?.value ?? 0) / 1000)}
            threshold={lcpThreshold}
            helpText={LCP_HELP_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StatThreshold
            description={'CLS'}
            title={stepMetrics.cls?.value ?? 0}
            threshold={clsThreshold}
            helpText={CLS_HELP_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StatThreshold
            description={'DCL'}
            title={formatMillisecond((stepMetrics.dcl?.value ?? 0) / 1000)}
            threshold={dclThreshold}
            helpText={DCL_TOOLTIP}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            titleSize="s"
            description={'Transfer size'}
            title={stepMetrics.transferData + ' MB'}
            reverse={true}
          />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGrid>
    </>
  );
};

const StatThreshold = ({
  title,
  threshold,
  description,
  helpText,
}: {
  threshold: number;
  title: number | string;
  description: string;
  helpText?: string;
}) => {
  const isUp = threshold >= 5;
  const isDown = threshold < 5;

  const isSame = (!isUp && !isDown) || !isFinite(threshold);
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiStat
          titleSize="s"
          {...(isSame ? {} : { titleColor: isUp ? 'danger' : 'success' })}
          description={
            <span>
              {description} {helpText && <EuiIconTip content={helpText} position="right" />}
            </span>
          }
          title={
            <>
              {title}
              <span style={{ marginLeft: 5 }}>
                {isSame ? (
                  <EuiIcon type="minus" size="l" color="subdued" />
                ) : (
                  <EuiIcon type={isUp ? 'sortUp' : 'sortDown'} size="l" />
                )}
              </span>
            </>
          }
          reverse={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const METRICS_LABEL = i18n.translate('xpack.synthetics.stepDetailsRoute.metrics', {
  defaultMessage: 'Metrics',
});

const TOTAL_DURATION_LABEL = i18n.translate('xpack.synthetics.totalDuration.metrics', {
  defaultMessage: 'Step duration',
});
