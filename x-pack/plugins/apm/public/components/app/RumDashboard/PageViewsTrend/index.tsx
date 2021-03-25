/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../Breakdowns/BreakdownFilter';
import { PageViewsChart } from '../Charts/PageViewsChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { createExploratoryViewUrl } from '../../../../../../observability/public';

export function PageViewsTrend() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, rangeFrom, rangeTo, searchTerm, serviceName } = urlParams;

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { data, status } = useFetcher(
    (callApmApi) => {
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
    [end, start, uiFilters, breakdown, searchTerm, serviceName]
  );

  const analyzeHref = createExploratoryViewUrl(
    {
      'page-views': {
        reportType: 'kpi',
        reportDefinitions: {
          'service.name': serviceName as string,
        },
        time: { from: rangeFrom!, to: rangeTo! },
      },
    },
    ''
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
        <EuiFlexItem grow={false}>
          <EuiButton size="s" href={analyzeHref}>
            Analyze
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PageViewsChart data={data} loading={status !== 'success'} />
    </div>
  );
}
