/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LogsSection } from '../../components/app/section/logs';
import { MetricsSection } from '../../components/app/section/metrics';
import { APMSection } from '../../components/app/section/apm';
import { UptimeSection } from '../../components/app/section/uptime';
import { UXSection } from '../../components/app/section/ux';

interface Props {
  bucketSize: string;
  hasData: any;
}

export function DataSections({ bucketSize, hasData }: Props) {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column">
        {hasData?.infra_logs && (
          <EuiFlexItem grow={false}>
            <LogsSection bucketSize={bucketSize} />
          </EuiFlexItem>
        )}
        {hasData?.infra_metrics && (
          <EuiFlexItem grow={false}>
            <MetricsSection bucketSize={bucketSize} />
          </EuiFlexItem>
        )}
        {hasData?.apm && (
          <EuiFlexItem grow={false}>
            <APMSection bucketSize={bucketSize} />
          </EuiFlexItem>
        )}
        {hasData?.uptime && (
          <EuiFlexItem grow={false}>
            <UptimeSection bucketSize={bucketSize} />
          </EuiFlexItem>
        )}
        {hasData?.ux && (
          <EuiFlexItem grow={false}>
            <UXSection serviceName={hasData.ux.serviceName} bucketSize={bucketSize} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
