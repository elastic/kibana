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
import { BackEndLabel, FrontEndLabel, PageViewsLabel } from '../translations';

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

  const getPageValue = (val?: number | null) => {
    if (val && val > 1000) {
      return val / 1000 + 'k';
    }
    return val;
  };

  return (
    <>
      <EuiSpacer size="l" />
      <EuiStat
        titleSize="m"
        title={(data?.backEnd?.value?.toFixed(2) ?? '0.00') + ' seconds'}
        description={BackEndLabel}
        isLoading={status !== 'success'}
      />
      <EuiSpacer size="l" />
      <EuiStat
        titleSize="m"
        title={getPageValue(data?.pageViews?.value) ?? '--'}
        description={PageViewsLabel}
        isLoading={status !== 'success'}
      />
      <EuiSpacer size="l" />
      <EuiStat
        titleSize="m"
        title={(data?.frontEnd?.value?.toFixed(2) ?? '--') + ' seconds'}
        description={FrontEndLabel}
        isLoading={status !== 'success'}
      />
    </>
  );
};
