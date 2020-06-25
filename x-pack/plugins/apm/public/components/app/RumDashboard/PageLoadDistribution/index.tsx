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
import { BreakdownFilter } from '../Breakdowns/BreakdownFilter';
import { PageLoadDistChart } from '../Charts/PageLoadDistChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';

export interface PercentileR {
  min?: number | null;
  max?: number | null;
}

export const PageLoadDistribution = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const [percentileRange, setPercentileRange] = useState<PercentileR>({
    min: null,
    max: null,
  });

  const [breakdowns, setBreakdowns] = useState<BreakdownItem[]>([]);

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
                    minPercentile: String(percentileRange.min),
                    maxPercentile: String(percentileRange.max),
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
    setPercentileRange({ min: min * 1000, max: max * 1000 });
  };

  const onBreakdownChange = (values: BreakdownItem[]) => {
    setBreakdowns(values);
  };

  return (
    <div data-cy="pageLoadDist">
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
            id={'pageLoad'}
            selectedBreakdowns={breakdowns}
            onBreakdownChange={onBreakdownChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PageLoadDistChart
        data={data}
        onPercentileChange={onPercentileChange}
        loading={status !== 'success'}
        breakdowns={breakdowns}
        percentileRange={{
          max: percentileRange.max || data?.maxDuration,
          min: percentileRange.min || data?.minDuration,
        }}
      />
    </div>
  );
};
