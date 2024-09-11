/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import { AddAPMCallOut } from '../../entities/logs/add_apm_callout';
import { LogRateChart } from '../../entities/charts/log_rate_chart';
import { LogErrorRateChart } from '../../entities/charts/log_error_rate_chart';
import { chartHeight } from '..';

interface Props {
  hasApmSignal?: boolean;
}

export function LogsOverview({ hasApmSignal }: Props) {
  const [isLogsApmCalloutEnabled, setIsLogsApmCalloutEnabled] = useLocalStorage(
    'apm.isLogsApmCalloutEnabled',
    true
  );

  return (
    <>
      {!hasApmSignal && isLogsApmCalloutEnabled ? (
        <>
          <AddAPMCallOut
            onClose={() => {
              setIsLogsApmCalloutEnabled(false);
            }}
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={4}>
          <LogRateChart height={chartHeight} />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <LogErrorRateChart height={chartHeight} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
