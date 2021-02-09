/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { I18LABELS } from '../translations';
import { KeyUXMetrics } from './KeyUXMetrics';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useUxQuery } from '../hooks/useUxQuery';
import { getCoreVitalsComponent } from '../../../../../../observability/public';
import { CsmSharedContext } from '../CsmSharedContext';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { getPercentileLabel } from './translations';

export function UXMetrics() {
  const {
    urlParams: { percentile },
  } = useUrlParams();

  const uxQuery = useUxQuery();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (uxQuery) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/web-core-vitals',
          params: {
            query: uxQuery,
          },
        });
      }
      return Promise.resolve(null);
    },
    [uxQuery]
  );

  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  const CoreVitals = useMemo(
    () =>
      getCoreVitalsComponent({
        data,
        totalPageViews,
        loading: status !== 'success',
        displayTrafficMetric: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status]
  );

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="xs">
            <h3>
              {I18LABELS.metrics} ({getPercentileLabel(percentile!)})
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <KeyUXMetrics data={data} loading={status !== 'success'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiHorizontalRule margin="xs" />

      <EuiFlexGroup justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiSpacer size="s" />
          {CoreVitals}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
