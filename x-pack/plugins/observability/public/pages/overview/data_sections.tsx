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

interface Props {
  bucketSize: BucketSize;
  hasData?: Partial<HasDataMap>;
}

export function DataSections({ bucketSize }: Props) {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <LogsSection bucketSize={bucketSize} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricsSection bucketSize={bucketSize} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <APMSection bucketSize={bucketSize} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UptimeSection bucketSize={bucketSize} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UXSection bucketSize={bucketSize} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
