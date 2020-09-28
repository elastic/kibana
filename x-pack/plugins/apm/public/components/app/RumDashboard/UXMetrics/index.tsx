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
import { CoreVitals } from '../CoreVitals';
import { KeyUXMetrics } from './KeyUXMetrics';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

export interface UXMetrics {
  cls: string;
  fid: string;
  lcp: string;
  tbt: number;
  fcp: number;
  lcpRanks: number[];
  fidRanks: number[];
  clsRanks: number[];
}

export function UXMetrics() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, searchTerm } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { serviceName } = uiFilters;
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/web-core-vitals',
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

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="s">
            <h2>{I18LABELS.userExperienceMetrics}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <KeyUXMetrics data={data} loading={status !== 'success'} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="xs">
            <h3>{I18LABELS.coreWebVitals}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <CoreVitals data={data} loading={status !== 'success'} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
