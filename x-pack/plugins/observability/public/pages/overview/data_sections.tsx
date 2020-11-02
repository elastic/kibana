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
import { UXHasDataResponse } from '../../typings/fetch_overview_data';
import { HasDataMap } from '../../context/has_data_context';

interface Props {
  bucketSize: string;
  absoluteTime: { start?: number; end?: number };
  relativeTime: { start: string; end: string };
  hasData?: Partial<HasDataMap>;
}

export function DataSections({ bucketSize, hasData, absoluteTime, relativeTime }: Props) {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column">
        {hasData?.infra_logs?.hasData && (
          <EuiFlexItem grow={false}>
            <LogsSection
              bucketSize={bucketSize}
              absoluteTime={absoluteTime}
              relativeTime={relativeTime}
            />
          </EuiFlexItem>
        )}
        {hasData?.infra_metrics?.hasData && (
          <EuiFlexItem grow={false}>
            <MetricsSection
              bucketSize={bucketSize}
              absoluteTime={absoluteTime}
              relativeTime={relativeTime}
            />
          </EuiFlexItem>
        )}
        {hasData?.apm?.hasData && (
          <EuiFlexItem grow={false}>
            <APMSection
              bucketSize={bucketSize}
              absoluteTime={absoluteTime}
              relativeTime={relativeTime}
            />
          </EuiFlexItem>
        )}
        {hasData?.uptime?.hasData && (
          <EuiFlexItem grow={false}>
            <UptimeSection
              bucketSize={bucketSize}
              absoluteTime={absoluteTime}
              relativeTime={relativeTime}
            />
          </EuiFlexItem>
        )}
        {(hasData?.ux?.hasData as UXHasDataResponse)?.hasData && (
          <EuiFlexItem grow={false}>
            <UXSection
              serviceName={(hasData?.ux?.hasData as UXHasDataResponse)?.serviceName as string}
              bucketSize={bucketSize}
              absoluteTime={absoluteTime}
              relativeTime={relativeTime}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
