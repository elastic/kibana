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
import { PageViewsChart } from '../Charts/PageViewsChart';
import { BreakdownItem } from '../../../../../typings/ui_filters';

export const PageViewsTrend = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;

  const [breakdowns, setBreakdowns] = useState<BreakdownItem[]>([]);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/page-view-trends',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              ...(breakdowns.length > 0
                ? {
                    breakdowns: JSON.stringify(breakdowns),
                  }
                : {}),
            },
          },
        });
      }
    },
    [end, start, serviceName, uiFilters, breakdowns]
  );

  const onBreakdownChange = (values: BreakdownItem[]) => {
    setBreakdowns(values);
  };

  return (
    <div>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{I18LABELS.pageViews}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BreakdownFilter
            id={'pageView'}
            selectedBreakdowns={breakdowns}
            onBreakdownChange={onBreakdownChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PageViewsChart data={data} loading={status !== 'success'} />
    </div>
  );
};
