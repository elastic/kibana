/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import numeral from '@elastic/numeral';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiToolTip } from '@elastic/eui';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { I18LABELS } from '../translations';
import { formatToSec } from '../UXMetrics/KeyUXMetrics';

const ClFlexGroup = styled(EuiFlexGroup)`
  flex-direction: row;
  @media only screen and (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

export function ClientMetrics() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, searchTerm } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { serviceName } = uiFilters;
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum/client-metrics',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchTerm,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, uiFilters, searchTerm]
  );

  const STAT_STYLE = { width: '240px' };

  const pageViewsTotal = data?.pageViews?.value ?? 0;

  return (
    <ClFlexGroup responsive={false}>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={formatToSec(data?.backEnd?.value ?? 0, 'ms')}
          description={I18LABELS.backEnd}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={formatToSec(data?.frontEnd?.value ?? 0, 'ms')}
          description={I18LABELS.frontEnd}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={
            pageViewsTotal < 10000 ? (
              numeral(pageViewsTotal).format('0,0')
            ) : (
              <EuiToolTip content={numeral(pageViewsTotal).format('0,0')}>
                <>{numeral(pageViewsTotal).format('0 a')}</>
              </EuiToolTip>
            )
          }
          description={I18LABELS.pageViews}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </ClFlexGroup>
  );
}
