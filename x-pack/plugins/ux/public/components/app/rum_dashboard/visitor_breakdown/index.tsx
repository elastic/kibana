/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { VisitorBreakdownChart } from '../charts/visitor_breakdown_chart';
import { I18LABELS, VisitorBreakdownLabel } from '../translations';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';

export function VisitorBreakdown() {
  const { rangeId, urlParams, uxUiFilters } = useLegacyUrlParams();

  const { start, end, searchTerm } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { serviceName } = uxUiFilters;

      if (start && end && serviceName) {
        return callApmApi('GET /internal/apm/ux/visitor-breakdown', {
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uxUiFilters),
              urlQuery: searchTerm,
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    // `rangeId` acts as a cache buster for stable ranges like "Today"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [end, start, uxUiFilters, searchTerm, rangeId]
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>{VisitorBreakdownLabel}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup style={{ height: 'calc(100% - 32px)' }}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{I18LABELS.browser}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <VisitorBreakdownChart
            options={data?.browsers}
            loading={status !== 'success'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{I18LABELS.operatingSystem}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <VisitorBreakdownChart
            options={data?.os}
            loading={status !== 'success'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
