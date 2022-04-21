/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import numeral from '@elastic/numeral';
import styled from 'styled-components';
import { useContext, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { useUxQuery } from '../hooks/use_ux_query';
import { formatToSec } from '../ux_metrics/key_ux_metrics';
import { CsmSharedContext } from '../csm_shared_context';

const ClFlexGroup = styled(EuiFlexGroup)`
  flex-direction: row;
  @media only screen and (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
  }
`;

function formatTitle(unit: string, value?: number) {
  if (typeof value === 'undefined') return I18LABELS.dataMissing;
  return formatToSec(value, unit);
}

function PageViewsTotalTitle({ pageViews }: { pageViews?: number }) {
  if (typeof pageViews === 'undefined') {
    return <>{I18LABELS.dataMissing}</>;
  }
  return pageViews < 10000 ? (
    <>{numeral(pageViews).format('0,0')}</>
  ) : (
    <EuiToolTip content={numeral(pageViews).format('0,0')}>
      <>{numeral(pageViews).format('0 a')}</>
    </EuiToolTip>
  );
}

export function Metrics() {
  const uxQuery = useUxQuery();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (uxQuery) {
        return callApmApi('GET /internal/apm/ux/client-metrics', {
          params: {
            query: {
              ...uxQuery,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [uxQuery]
  );

  const { setSharedData } = useContext(CsmSharedContext);

  useEffect(() => {
    setSharedData({ totalPageViews: data?.pageViews?.value ?? 0 });
  }, [data, setSharedData]);

  const STAT_STYLE = { minWidth: '150px', maxWidth: '250px' };

  return (
    <ClFlexGroup wrap responsive={false}>
      <EuiFlexItem style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={formatTitle('ms', data?.totalPageLoadDuration?.value)}
          description={
            <>
              {I18LABELS.totalPageLoad}
              <EuiIconTip
                content={I18LABELS.totalPageLoadTooltip}
                type="questionInCircle"
              />
            </>
          }
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={formatTitle('ms', data?.backEnd?.value)}
          description={
            <>
              {I18LABELS.backEnd}
              <EuiIconTip
                content={I18LABELS.backEndTooltip}
                type="questionInCircle"
              />
            </>
          }
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={formatTitle('ms', data?.frontEnd?.value)}
          description={
            <>
              {I18LABELS.frontEnd}
              <EuiIconTip
                content={I18LABELS.frontEndTooltip}
                type="questionInCircle"
              />
            </>
          }
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
      <EuiFlexItem style={STAT_STYLE}>
        <EuiStat
          titleSize="l"
          title={<PageViewsTotalTitle pageViews={data?.pageViews?.value} />}
          description={I18LABELS.pageViews}
          isLoading={status !== 'success'}
        />
      </EuiFlexItem>
    </ClFlexGroup>
  );
}
