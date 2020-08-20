/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';

import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { CoreVitalItem } from './ColorPaletteFlexItem';
import {
  CLS_LABEL,
  FCP_LABEL,
  FID_LABEL,
  LCP_LABEL,
  TBT_LABEL,
} from './translations';

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

  return (
    <EuiFlexGrid gutterSize="xl">
      <EuiFlexItem>
        <CoreVitalItem
          title={LCP_LABEL}
          value={data?.lcp + 's'}
          ranks={data?.lcpRanks}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={FID_LABEL}
          value={data?.fid ?? 'N/A'}
          ranks={data?.fidRanks}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={CLS_LABEL}
          value={data?.cls ?? 'N/A'}
          ranks={data?.clsRanks}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={FCP_LABEL}
          value={data?.fcp + 's'}
          ranks={data?.fcpRanks}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={TBT_LABEL}
          value={data?.tbt ?? 'N/A'}
          ranks={data?.tbtRanks}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}
