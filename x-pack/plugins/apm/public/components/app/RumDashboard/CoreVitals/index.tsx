/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { CLS_LABEL, FID_LABEL, LCP_LABEL } from './translations';
import { CoreVitalItem } from './CoreVitalItem';

const CoreVitalsThresholds = {
  LCP: { good: '2.5s', bad: '4.0s' },
  FID: { good: '100ms', bad: '300ms' },
  CLS: { good: '0.1', bad: '0.25' },
};

export function CoreVitals() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/web-core-vitals',
          params: {
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters]
  );

  const { lcp, lcpRanks, fid, fidRanks, cls, clsRanks } = data || {};

  return (
    <EuiFlexGroup gutterSize="xl" justifyContent={'spaceBetween'}>
      <EuiFlexItem>
        <CoreVitalItem
          title={LCP_LABEL}
          value={lcp ? lcp + 's' : '0'}
          ranks={lcpRanks}
          loading={status !== 'success'}
          thresholds={CoreVitalsThresholds.LCP}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={FID_LABEL}
          value={fid ? fid + 's' : '0'}
          ranks={fidRanks}
          loading={status !== 'success'}
          thresholds={CoreVitalsThresholds.FID}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={CLS_LABEL}
          value={cls ?? '0'}
          ranks={clsRanks}
          loading={status !== 'success'}
          thresholds={CoreVitalsThresholds.CLS}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
