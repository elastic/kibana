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
  EuiButtonEmpty,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { useStepMetrics } from '../hooks/use_step_metrics';
import { formatMillisecond } from './network_timings_donut';
import { useStepPrevMetrics } from '../hooks/use_step_prev_metrics';

export const StepMetrics = () => {
  const stepMetrics = useStepMetrics();

  const { fcpThreshold, lcpThreshold, clsThreshold } = useStepPrevMetrics(stepMetrics);

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>Metrics</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="list">Definitions</EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <StatThreshold
            description={'FCP'}
            title={formatMillisecond((stepMetrics.fcp?.value ?? 0) / 1000)}
            threshold={fcpThreshold}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StatThreshold
            description={'LCP'}
            title={formatMillisecond((stepMetrics.lcp?.value ?? 0) / 1000)}
            threshold={lcpThreshold}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StatThreshold
            description={'CLS'}
            title={stepMetrics.cls?.value ?? 0}
            threshold={clsThreshold}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <EuiStat
            description={'Transfer size'}
            title={stepMetrics.transferData + ' MB'}
            reverse={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const StatThreshold = ({
  title,
  threshold,
  description,
}: {
  threshold: number;
  title: number | string;
  description: string;
}) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiStat
          description={description}
          title={
            <>
              {title}
              {Math.abs(threshold) >= 5 ? (
                <EuiIcon type={threshold > 5 ? 'sortUp' : 'sortDown'} size="m" />
              ) : (
                <EuiText size="m" style={{ display: 'inline-block' }}>
                  {' '}
                  -
                </EuiText>
              )}
            </>
          }
          reverse={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
