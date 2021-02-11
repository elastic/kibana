/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useTrackPageview } from '../../../../observability/public';
import { useInitApp } from '../../hooks/use_init_app';
import { StepsList } from '../../components/synthetics/check_steps/steps_list';
import { useCheckSteps } from '../../components/synthetics/check_steps/use_check_steps';
import { ChecksNavigation } from './checks_navigation';
import { useMonitorBreadcrumb } from '../../components/monitor/synthetics/step_detail/use_monitor_breadcrumb';
import { EmptyJourney } from '../../components/synthetics/empty_journey';

export const SyntheticsCheckSteps: React.FC = () => {
  useInitApp();
  useTrackPageview({ app: 'uptime', path: 'syntheticCheckSteps' });
  useTrackPageview({ app: 'uptime', path: 'syntheticCheckSteps', delay: 15000 });

  const { error, loading, steps, details, checkGroup } = useCheckSteps();

  useMonitorBreadcrumb({ details, activeStep: details?.journey });

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h1>{details?.journey?.monitor.name}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {details && <ChecksNavigation timestamp={details.timestamp} details={details} />}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <StepsList data={steps} loading={loading} error={error} />
      {(!steps || steps.length === 0) && !loading && <EmptyJourney checkGroup={checkGroup} />}
    </>
  );
};
