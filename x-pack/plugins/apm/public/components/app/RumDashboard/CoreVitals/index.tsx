/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CLS_LABEL, FID_LABEL, LCP_LABEL } from './translations';
import { CoreVitalItem } from './CoreVitalItem';
import { UXMetrics } from '../UXMetrics';

const CoreVitalsThresholds = {
  LCP: { good: '2.5s', bad: '4.0s' },
  FID: { good: '100ms', bad: '300ms' },
  CLS: { good: '0.1', bad: '0.25' },
};

interface Props {
  data?: UXMetrics | null;
  loading: boolean;
}

export function CoreVitals({ data, loading }: Props) {
  const { lcp, lcpRanks, fid, fidRanks, cls, clsRanks } = data || {};

  return (
    <EuiFlexGroup gutterSize="xl" justifyContent={'spaceBetween'}>
      <EuiFlexItem>
        <CoreVitalItem
          title={LCP_LABEL}
          value={lcp ? lcp + 's' : '0'}
          ranks={lcpRanks}
          loading={loading}
          thresholds={CoreVitalsThresholds.LCP}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={FID_LABEL}
          value={fid ? fid + 's' : '0'}
          ranks={fidRanks}
          loading={loading}
          thresholds={CoreVitalsThresholds.FID}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={CLS_LABEL}
          value={cls ?? '0'}
          ranks={clsRanks}
          loading={loading}
          thresholds={CoreVitalsThresholds.CLS}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
