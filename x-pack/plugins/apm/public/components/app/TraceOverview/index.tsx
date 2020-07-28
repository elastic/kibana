/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { TraceList } from './TraceList';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../observability/public';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { APIReturnType } from '../../../services/rest/createCallApmApi';

type TracesAPIResponse = APIReturnType<'/api/apm/traces'>;
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
          pathname: '/api/apm/traces',
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
      projection: PROJECTION.TRACES,
    };

    return config;
  }, []);

  return (
    <>
      <EuiSpacer />
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
    </>
  );
}
