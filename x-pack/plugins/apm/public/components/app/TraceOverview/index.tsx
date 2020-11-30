/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { Projection } from '../../../../common/projections';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { SearchBar } from '../../shared/search_bar';
import { TraceList } from './TraceList';

type TracesAPIResponse = APIReturnType<'GET /api/apm/traces'>;
const DEFAULT_RESPONSE: TracesAPIResponse = {
  items: [],
  isAggregationAccurate: true,
  bucketSize: 0,
};

export function TraceOverview() {
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end } = urlParams;
  const { status, data = DEFAULT_RESPONSE } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/traces',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [start, end, uiFilters]
  );

  useTrackPageview({ app: 'apm', path: 'traces_overview' });
  useTrackPageview({ app: 'apm', path: 'traces_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionResult', 'host', 'containerId', 'podName'],
      projection: Projection.traces,
    };

    return config;
  }, []);

  return (
    <>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <LocalUIFilters {...localUIFiltersConfig} showCount={false} />
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <EuiPanel>
              <TraceList
                items={data.items}
                isLoading={status === FETCH_STATUS.LOADING}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
