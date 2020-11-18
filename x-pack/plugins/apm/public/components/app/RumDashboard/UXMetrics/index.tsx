/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
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
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUxQuery } from '../hooks/useUxQuery';
import { CoreVitals } from '../../../../../../observability/public';
import { CsmSharedContext } from '../CsmSharedContext';
import { useUrlParams } from '../../../../hooks/useUrlParams';
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
          pathname: '/api/apm/rum-client/web-core-vitals',
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
          <CoreVitals
            data={data}
            totalPageViews={totalPageViews}
            loading={status !== 'success'}
            displayTrafficMetric={true}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
