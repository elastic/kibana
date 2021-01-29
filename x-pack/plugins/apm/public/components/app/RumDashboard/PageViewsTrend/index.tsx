/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../Breakdowns/BreakdownFilter';
import { PageViewsChart } from '../Charts/PageViewsChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';

export function PageViewsTrend() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, searchTerm } = urlParams;

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { serviceName } = uiFilters;

      if (start && end && serviceName) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/page-view-trends',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchTerm,
              ...(breakdown
                ? {
                    breakdowns: JSON.stringify(breakdown),
                  }
                : {}),
            },
          },
        });
      }
      return Promise.resolve(undefined);
    },
    [end, start, uiFilters, breakdown, searchTerm]
  );

  return (
    <div>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageViews}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pvBreakdownFilter'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PageViewsChart data={data} loading={status !== 'success'} />
    </div>
  );
}
