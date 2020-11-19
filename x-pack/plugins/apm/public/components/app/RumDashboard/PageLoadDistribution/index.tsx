/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { I18LABELS } from '../translations';
import { BreakdownFilter } from '../Breakdowns/BreakdownFilter';
import { PageLoadDistChart } from '../Charts/PageLoadDistChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { ResetPercentileZoom } from './ResetPercentileZoom';

export interface PercentileRange {
  min?: number | null;
  max?: number | null;
}

export function PageLoadDistribution() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, searchTerm } = urlParams;

  const [percentileRange, setPercentileRange] = useState<PercentileRange>({
    min: null,
    max: null,
  });

  const [breakdown, setBreakdown] = useState<BreakdownItem | null>(null);

  const { data, status } = useFetcher(
    (callApmApi) => {
      const { serviceName } = uiFilters;

      if (start && end && serviceName) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/page-load-distribution',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              urlQuery: searchTerm,
              ...(percentileRange.min && percentileRange.max
                ? {
                    minPercentile: String(percentileRange.min),
                    maxPercentile: String(percentileRange.max),
                  }
                : {}),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [
      end,
      start,
      uiFilters,
      percentileRange.min,
      percentileRange.max,
      searchTerm,
    ]
  );

  const onPercentileChange = (min: number, max: number) => {
    setPercentileRange({ min, max });
  };

  return (
    <div data-cy="pageLoadDist">
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageLoadDistribution}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ResetPercentileZoom
            percentileRange={percentileRange}
            setPercentileRange={setPercentileRange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 170 }}>
          <BreakdownFilter
            selectedBreakdown={breakdown}
            onBreakdownChange={setBreakdown}
            dataTestSubj={'pldBreakdownFilter'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <PageLoadDistChart
        data={data}
        onPercentileChange={onPercentileChange}
        loading={status !== 'success'}
        breakdown={breakdown}
        percentileRange={{
          max: percentileRange.max || data?.maxDuration,
          min: percentileRange.min || data?.minDuration,
        }}
      />
    </div>
  );
}
