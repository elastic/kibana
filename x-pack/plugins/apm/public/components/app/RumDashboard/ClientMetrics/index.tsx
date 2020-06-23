/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @flow
import * as React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { BackEndLabel, FrontEndLabel, PageViewsLabel } from '../translations';

export const formatBigValue = (val?: number | null, fixed?: number): string => {
  if (val && val >= 1000) {
    const result = val / 1000;
    if (fixed) {
      return result.toFixed(fixed) + 'k';
    }
    return result + 'k';
  }
  return val + '';
};

const ClFlexGroup = styled(EuiFlexGroup)`
  flex-direction: row;
  @media only screen and (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

export const ClientMetrics = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum/client-metrics',
          params: {
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
    },
    [start, end, uiFilters]
  );

  const STAT_STYLE = { width: '240px' };

  return (
    <ClFlexGroup responsive={false}>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={(data?.backEnd?.value?.toFixed(2) ?? '-') + ' sec'}
          description={BackEndLabel}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={(data?.frontEnd?.value?.toFixed(2) ?? '-') + ' sec'}
          description={FrontEndLabel}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatBigValue(data?.pageViews?.value, 2) ?? '-'}
          description={PageViewsLabel}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </ClFlexGroup>
  );
};
