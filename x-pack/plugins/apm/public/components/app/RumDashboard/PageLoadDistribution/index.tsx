/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { PageLoadDistLabel, ResetZoomLabel } from '../translations';
import { BreakdownFilter } from '../BreakdownFilter';
import { PageLoadDistChart } from '../Charts/PageLoadDistChart';

export interface PercentileR {
  min: string | null;
  max: string | null;
}

export const PageLoadDistribution = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const [percentileRange, setPercentileRange] = useState<PercentileR>({
    min: null,
    max: null,
  });

  const [breakdowns, setBreakdowns] = useState<Map<string, string[]>>(
    new Map()
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum-client/page-load-distribution',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              ...(percentileRange.min && percentileRange.max
                ? {
                    minPercentile: percentileRange.min,
                    maxPercentile: percentileRange.max,
                  }
                : {}),
            },
          },
        });
      }
    },
    [end, start, uiFilters, percentileRange.min, percentileRange.max]
  );

  const onPercentileChange = (min: number, max: number) => {
    setPercentileRange({ min: String(min), max: String(max) });
  };

  const onBreakdownChange = (values: Map<string, string[]>) => {
    setBreakdowns(values);
  };

  return (
    <div>
      <EuiSpacer size="m" />
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{PageLoadDistLabel}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="inspect"
            size="s"
            onClick={() => {
              setPercentileRange({ min: null, max: null });
            }}
            disabled={
              percentileRange.min === null && percentileRange.max === null
            }
          >
            {ResetZoomLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BreakdownFilter
            fieldName="pageLoadBreakdown"
            onBreakdownChange={onBreakdownChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <PageLoadDistChart
        data={data}
        onPercentileChange={onPercentileChange}
        loading={status !== 'success'}
        breakdowns={breakdowns}
        percentileRange={percentileRange}
      />
    </div>
  );
};
