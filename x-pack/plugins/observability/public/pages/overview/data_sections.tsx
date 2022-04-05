/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { APMSection } from '../../components/app/section/apm';
import { LogsSection } from '../../components/app/section/logs';
import { MetricsSection } from '../../components/app/section/metrics';
import { UptimeSection } from '../../components/app/section/uptime';
import { UXSection } from '../../components/app/section/ux';
import { HasDataMap } from '../../context/has_data_context';
import { BucketSize } from '.';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import type { ObservabilityAppServices } from '../../application/types';

interface Props {
  bucketSize: BucketSize;
  hasData?: Partial<HasDataMap>;
}

export function DataSections({ bucketSize }: Props) {
  const { capabilities } = useKibana<ObservabilityAppServices>().services.application!;

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        {capabilities.logs.show ? (
          <EuiFlexItem grow={false}>
            <LogsSection bucketSize={bucketSize} />
          </EuiFlexItem>
        ) : null}

        {capabilities.infrastructure.show ? (
          <EuiFlexItem grow={false}>
            <MetricsSection bucketSize={bucketSize} />
          </EuiFlexItem>
        ) : null}

        {capabilities.apm.show ? (
          <EuiFlexItem grow={false}>
            <APMSection bucketSize={bucketSize} />
          </EuiFlexItem>
        ) : null}

        {capabilities.uptime.show ? (
          <EuiFlexItem grow={false}>
            <UptimeSection bucketSize={bucketSize} />
          </EuiFlexItem>
        ) : null}

        {/* UX is grouped with APM */}
        {capabilities.apm.show ? (
          <EuiFlexItem grow={false}>
            <UXSection bucketSize={bucketSize} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
