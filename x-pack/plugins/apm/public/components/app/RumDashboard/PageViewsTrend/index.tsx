/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { PageViewsLabel } from '../translations';
import { BreakdownFilter } from '../BreakdownFilter';
import { PageViewsChart } from '../Charts/PageViewsChart';

export const PageViewsTrend = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const [breakdowns, setBreakdowns] = useState<Map<string, string[]>>(
    new Map()
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum-client/page-view-trends',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              ...(breakdowns.size > 0
                ? {
                    breakdowns: JSON.stringify(
                      Array.from(breakdowns.entries())
                    ),
                  }
                : {}),
            },
          },
        });
      }
    },
    [end, start, uiFilters, breakdowns]
  );

  const onBreakdownChange = (values: Map<string, string[]>) => {
    setBreakdowns(values);
  };

  return (
    <div>
      <EuiSpacer size="l" />

      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{PageViewsLabel}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BreakdownFilter
            fieldName="pageLoadBreakdown"
            onBreakdownChange={onBreakdownChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <PageViewsChart
        data={data}
        loading={status !== 'success'}
        breakdowns={breakdowns}
      />
    </div>
  );
};
