/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @flow
import * as React from 'react';
import { EuiSpacer, EuiStat } from '@elastic/eui';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';

export const ClientMetrics = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const { data } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        pathname: '/api/apm/rum/client-metrics',
        params: {
          query: { start, end, uiFilters: JSON.stringify(uiFilters) },
        },
      });
    },
    [start, end, uiFilters]
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiStat
        titleSize="m"
        title={(data?.backEnd?.value.toFixed(2) ?? '--') + ' seconds'}
        description="Backend"
      />
      <EuiSpacer size="l" />
      <EuiStat
        titleSize="m"
        title={data?.pageViews.value ?? '--'}
        description="Page views"
      />
      <EuiSpacer size="l" />
      <EuiStat
        titleSize="m"
        title={(data?.frontEnd?.value.toFixed(2) ?? '--') + ' seconds'}
        description="Frontend"
      />
    </>
  );
};
