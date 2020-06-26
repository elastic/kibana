/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { I18LABELS } from '../translations';

export const formatBigValue = (val?: number | null): string => {
  if (val && val >= 1000) {
    const result = val / 1000;

    return Math.round(result) + 'k';
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

export function ClientMetrics() {
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
          description={I18LABELS.backEnd}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={(data?.frontEnd?.value?.toFixed(2) ?? '-') + ' sec'}
          description={I18LABELS.frontEnd}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="s"
          title={formatBigValue(data?.pageViews?.value) ?? '-'}
          description={I18LABELS.pageViews}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </ClFlexGroup>
  );
}
