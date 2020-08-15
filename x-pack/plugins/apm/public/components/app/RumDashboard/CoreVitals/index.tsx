/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import styled from 'styled-components';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { CoreVitalItem } from './ColorPaletteFlexItem';

const ClFlexGroup = styled(EuiFlexGroup)`
  flex-direction: row;
  @media only screen and (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

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

  const lcpRanks = (data?.lcpRanks ?? [0, 0]).map(({ value }) => value);
  const fcpRanks = (data?.fcpRanks ?? [0, 0]).map(({ value }) => value);

  return (
    <EuiFlexGrid gutterSize="xl">
      <EuiFlexItem>
        <CoreVitalItem
          title={'Largest Contentful Paint'}
          value={(data?.lcp?.toFixed(2) ?? 0) + 's'}
          ranks={[
            lcpRanks?.[0],
            lcpRanks?.[1] - lcpRanks?.[0],
            100 - lcpRanks?.[1],
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title="First Input Delay"
          value={'0.14'}
          ranks={[0, 0, 0]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={'Cumulative Layout Shift'}
          value={'3.6s'}
          ranks={[0, 0, 0]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={'First Contentful Paint'}
          value={(data?.fcp?.toFixed(2) ?? 0) + 's'}
          ranks={[
            fcpRanks?.[0],
            fcpRanks?.[1] - fcpRanks?.[0],
            100 - fcpRanks?.[1],
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={'Total Blocking Time'}
          value={'3.6s'}
          ranks={[0, 0, 0]}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}
