/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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

export function UXMetrics() {
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

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="s">
            <h2>{I18LABELS.userExperienceMetrics}</h2>
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
          <CoreVitals data={data} loading={status !== 'success'} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
