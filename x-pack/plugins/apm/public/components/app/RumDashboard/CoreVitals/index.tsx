/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

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

  return (
    <ClFlexGroup wrap>
      <EuiFlexItem>
        <CoreVitalItem
          title={'Largest Contentful Paint'}
          value={data?.lcp?.toFixed(0) ?? '0s'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem title="First Input Delay" value={'0.14'} />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem title={'Cumulative Layout Shift'} value={'3.6s'} />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem
          title={'First Contentful Paint'}
          value={data?.fcp?.toFixed(0) ?? '0s'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <CoreVitalItem title={'Total Blocking Time'} value={'3.6s'} />
      </EuiFlexItem>
    </ClFlexGroup>
  );
}
